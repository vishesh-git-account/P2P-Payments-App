const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  // 1. Get token from header
  const token = req.header('Authorization');

  // 2. Check if no token exists
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  // 3. Verify token
  try {
    // We expect the token format to be "Bearer <token>"
    const decoded = jwt.verify(token.split(' ')[1], process.env.JWT_SECRET);
    req.user = decoded; // Attach the user ID to the request
    next(); // Move on to the next function
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};