const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  sender: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true // 🚀 Instantly look up all money a user sent
  },
  receiver: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true // 🚀 Instantly look up all money a user received
  },
  amount: { 
    type: Number, 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['pending', 'completed', 'failed'], 
    default: 'pending',
    index: true // 🚀 Speeds up dashboard filtering
  },
  stripePaymentIntentId: { 
    type: String,
    required: true
  },
  createdAt: { 
    type: Date, 
    default: Date.now,
    index: true // 🚀 Speeds up your Cron Job garbage collector!
  }
});

module.exports = mongoose.model('Transaction', transactionSchema);