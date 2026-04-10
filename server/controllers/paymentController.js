const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Transaction = require('../models/Transaction');
const User = require('../models/User');

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

// @route   GET /api/payments/history
// @desc    Get transaction history for the logged-in user
exports.getTransactionHistory = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Find transactions where the user is either the sender OR the receiver
    const transactions = await Transaction.find({
      $or: [{ sender: userId }, { receiver: userId }]
    })
    .populate('sender', 'name email') // This pulls the actual name/email instead of just the ID!
    .populate('receiver', 'name email')
    .sort({ createdAt: -1 }); // Sort by newest first

    res.json(transactions);
  } catch (error) {
    console.error("History Error:", error);
    res.status(500).json({ message: 'Server error fetching history' });
  }
};