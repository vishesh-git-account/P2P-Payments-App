const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { registerUser, loginUser, getMe, getAllUsers} = require('../controllers/authController');
const { loginLimiter } = require('../middleware/rateLimiter');

// POST request to /api/auth/register
router.post('/register', registerUser);
router.post('/login',loginLimiter,loginUser);
router.get('/me',auth,getMe);
router.get('/users',auth,getAllUsers);

module.exports = router;