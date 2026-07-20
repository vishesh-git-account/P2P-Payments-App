const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const mongoose = require('mongoose');
const cache = require('../config/cache');

// @route   POST /api/payments/intent
// @desc    Create a payment intent and a pending transaction
exports.createPaymentIntent = async (req, res) => {
  try {
    const { receiverId, amount } = req.body;
    const senderId = req.user.userId; // Coming from our auth middleware!

    // 1. Basic validation
    if (!receiverId || !amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid payment details' });
    }

    // 2. Create the Payment Intent with Stripe (amount is in cents!)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, 
      currency: 'usd',
      metadata: {
        senderId: senderId,
        receiverId: receiverId
      }
    });

    // 3. Create a pending transaction in our database
    const transaction = new Transaction({
      sender: senderId,
      receiver: receiverId,
      amount: amount,
      status: 'pending',
      stripePaymentIntentId: paymentIntent.id
    });

    await transaction.save();
    // Bust the cache so their dashboard updates!
    cache.del(`analytics_${req.user.userId}`);

    // 4. Send the client secret back to the frontend
    res.json({
      clientSecret: paymentIntent.client_secret,
      transactionId: transaction._id
    });

  } catch (error) {
    console.error("Payment Intent Error:", error);
    res.status(500).json({ message: 'Server error creating payment intent' });
  }
};

// @route   GET /api/payments/history?page=1&limit=10
exports.getTransactionHistory = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // 1. Get page and limit from the URL (default to page 1, 10 items)
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = {
      $or: [
        { sender: userId }, 
        { receiver: userId, status: 'completed' } 
      ]
    };

    // 2. Fetch the specific slice of transactions
    const transactions = await Transaction.find(query)
      .populate('sender', 'name email')
      .populate('receiver', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)   // 🚀 Skip the ones we already loaded
      .limit(limit); // 🚀 Only grab the next 10

    // 3. Count total documents to tell the frontend if there is more data
    const totalTransactions = await Transaction.countDocuments(query);
    const hasMore = totalTransactions > (skip + transactions.length);

    // 4. Send back an object containing both the data and the hasMore boolean
    res.json({ 
      transactions, 
      hasMore 
    });

  } catch (error) {
    console.error("History Error:", error);
    res.status(500).json({ message: 'Server error fetching history' });
  }
};

// @route   GET /api/payments/analytics
exports.getWalletAnalytics = async (req, res) => {
  try {
    const userId = req.user.userId;
    const cacheKey = `analytics_${userId}`; // 🚀 Create a unique key for this user

    // 1. CHECK THE CACHE FIRST
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      console.log('⚡ Serving from Redis/Cache!');
      return res.json(cachedData);
    }

    console.log('🐌 Serving from MongoDB...');
    const mongoose = require('mongoose');
    const objectIdUser = new mongoose.Types.ObjectId(userId);

    const stats = await Transaction.aggregate([
      {
        $match: {
          $or: [
            { sender: objectIdUser },
            { receiver: objectIdUser, status: 'completed' }
          ]
        }
      },
      {
        $group: {
          _id: null, 
          totalSent: { $sum: { $cond: [{ $eq: ["$sender", objectIdUser] }, "$amount", 0] } },
          totalReceived: { $sum: { $cond: [{ $eq: ["$receiver", objectIdUser] }, "$amount", 0] } },
          transactionCount: { $sum: 1 }
        }
      }
    ]);

    const result = stats.length > 0 ? stats[0] : { totalSent: 0, totalReceived: 0, transactionCount: 0 };
    delete result._id;
    
    // 2. SAVE TO CACHE FOR NEXT TIME
    cache.set(cacheKey, result);

    res.json(result);

  } catch (error) {
    console.error("Analytics Error:", error);
    res.status(500).json({ message: 'Server error fetching analytics' });
  }
};