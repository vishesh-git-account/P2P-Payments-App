const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth'); // Import our gatekeeper
const { createPaymentIntent, getTransactionHistory,getWalletAnalytics } = require('../controllers/paymentController');
const { paymentLimiter } = require('../middleware/rateLimiter');

// Notice we put 'auth' here. You MUST be logged in to hit this route!
router.post('/intent', auth,paymentLimiter, createPaymentIntent);
router.get('/history', auth, getTransactionHistory);
router.get('/analytics', auth, getWalletAnalytics);

module.exports = router;