const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const cache = require('../config/cache'); 
const mongoose = require('mongoose'); // 🚀 NEW: Required for ACID transactions

exports.handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  // 1. Verify the Stripe Signature
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    console.log(`\n✅ [WEBHOOK CAUGHT] Event Type: ${event.type}`);
  } catch (err) {
    console.error(`\n❌ [WEBHOOK ERROR] Signature failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // 2. Handle the Payment Success Event
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;

    try {
      // Find the transaction BEFORE starting the session
      const transaction = await Transaction.findOne({ stripePaymentIntentId: paymentIntent.id });

      // Idempotency Check: Safely abort if missing or already processed
      if (!transaction) return res.status(200).send('Transaction not found');
      if (transaction.status === 'completed') return res.status(200).send('Already processed');

      // ==========================================
      // 🛡️ START THE ACID TRANSACTION
      // ==========================================
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        // Step A: Update Transaction Status (Pass the session!)
        transaction.status = 'completed';
        await transaction.save({ session }); 

        // Step B: Add money to Receiver (Pass the session!)
        const receiver = await User.findById(transaction.receiver).session(session);
        if (receiver) {
          receiver.balance += transaction.amount;
          await receiver.save({ session }); 
        }

        // Step C: If both steps succeeded, lock it in!
        await session.commitTransaction();
        console.log(`💰 [ACID SUCCESS] Added $${transaction.amount} to wallet!`);

      } catch (transactionError) {
        // 💥 Step D: IF ANYTHING FAILED, ABORT AND ROLLBACK!
        await session.abortTransaction();
        console.error("💥 ACID Rollback triggered! Money is safe.", transactionError);
        throw transactionError; // Pass error to outer catch block to fail gracefully
      } finally {
        // Always end the session to prevent memory leaks
        session.endSession();
      }

      // ==========================================
      // 🧹 CACHE INVALIDATION (BUST THE CACHE)
      // ==========================================
      if (transaction.sender) cache.del(`analytics_${transaction.sender.toString()}`);
      if (transaction.receiver) cache.del(`analytics_${transaction.receiver.toString()}`);
      console.log('🧹 Cleared cache for both Sender and Receiver!');

      // ==========================================
      // 📡 REAL-TIME WEBSOCKET PUSH
      // ==========================================
      const io = req.app.get('io');
      const connectedUsers = req.app.get('connectedUsers');

      if (io && connectedUsers) {
        if (transaction.receiver) {
          const receiverSocketId = connectedUsers.get(transaction.receiver.toString());
          if (receiverSocketId) {
            io.to(receiverSocketId).emit('paymentReceived', {
              amount: transaction.amount,
              message: 'Money received!'
            });
          }
        }

        if (transaction.sender) {
          const senderSocketId = connectedUsers.get(transaction.sender.toString());
          if (senderSocketId) {
            io.to(senderSocketId).emit('paymentSent', { amount: transaction.amount });
            console.log(`📡 Live update pushed to Sender ${transaction.sender}`);
          }
        }
      }

    } catch (error) {
      console.error("❌ Database error during webhook:", error);
      return res.status(500).send('Internal Server Error');
    }
  }

  // Acknowledge receipt to Stripe
  res.send();
};