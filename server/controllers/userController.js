const User = require('../models/User');

// @route   GET /api/users/search?q=something
// @desc    Search users by name or email
exports.searchUsers = async (req, res) => {
  try {
    const searchQuery = req.query.q;
    const currentUserId = req.user.userId; // From auth middleware

    if (!searchQuery) {
      return res.json([]); // Return empty array if search is blank
    }

    // Use MongoDB Regex to find partial matches, ignoring case ('i')
    const users = await User.find({
      _id: { $ne: currentUserId }, // NEVER return the logged-in user!
      $or: [
        { name: { $regex: searchQuery, $options: 'i' } },
        { email: { $regex: searchQuery, $options: 'i' } }
      ]
    })
    .select('-password -balance') // SECURITY: Never send passwords or balances to the frontend!
    .limit(5); // Only return the top 5 results to keep it fast

    res.json(users);
  } catch (error) {
    console.error("Search Error:", error);
    res.status(500).json({ message: 'Server error during search' });
  }
};