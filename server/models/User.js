const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    index: true // 🚀 NEW: Makes your Search Bar lightning fast
  },
  email: { 
    type: String, 
    required: true, 
    unique: true // (This automatically creates a unique index!)
  },
  password: { 
    type: String, 
    required: true 
  },
  // We will need this later for the payment gateway
  stripeCustomerId: { 
    type: String 
  }, 
  balance: { 
    type: Number, 
    default: 0 
  }, 
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('User', userSchema);