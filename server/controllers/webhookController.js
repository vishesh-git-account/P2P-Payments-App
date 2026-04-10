const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Transaction = require('../models/Transaction');
const User = require('../models/User');

// @route   POST /api/webhooks/stripe
// @desc    Handle Stripe webhooks (Payment Success/Failure)
exports.handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    console.log(`\n✅ [WEBHOOK CAUGHT] Signature verified! Event Type: ${event.type}`);
  } catch (err) {
    console.error(`\n❌ [WEBHOOK ERROR] Signature failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    console.log(`🔍 [WEBHOOK SEARCH] Looking for DB Transaction with Stripe ID: ${paymentIntent.id}`);
    
    try {
      const transaction = await Transaction.findOne({ stripePaymentIntentId: paymentIntent.id });
      
      if (!transaction) {
        console.log(`⚠️ [WEBHOOK MISSING] Could not find that transaction in MongoDB!`);
      } else {
        console.log(`✅ [WEBHOOK FOUND] Transaction found! Updating status from ${transaction.status} to completed.`);
        
        if (transaction.status === 'pending') {
          transaction.status = 'completed';
          await transaction.save();

          const receiver = await User.findById(transaction.receiver);
          if (receiver) {
            receiver.balance += transaction.amount;
            await receiver.save();
            console.log(`💰 [WEBHOOK SUCCESS] Added $${transaction.amount} to ${receiver.name}'s wallet!`);
          }
        }
      }
    } catch (error) {
      console.error("Database error during webhook:", error);
    }
  }

  res.send();
};