const express = require('express');
const router = express.Router();
const { handleStripeWebhook } = require('../controllers/webhookController');

// We do NOT use the 'auth' middleware here because Stripe is calling this, not our user.
router.post('/stripe', handleStripeWebhook);

module.exports = router;