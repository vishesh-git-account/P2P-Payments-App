const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth'); // Import our gatekeeper
const { createPaymentIntent, getTransactionHistory } = require('../controllers/paymentController');

// Notice we put 'auth' here. You MUST be logged in to hit this route!
router.post('/intent', auth, createPaymentIntent);
router.get('/history', auth, getTransactionHistory);

module.exports = router;