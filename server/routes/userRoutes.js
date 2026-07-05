const express = require('express');
const router = express.Router();
const { searchUsers } = require('../controllers/userController');
const authMiddleware = require('../middleware/auth'); // Use your actual auth middleware path

router.get('/search', authMiddleware, searchUsers);

module.exports = router;