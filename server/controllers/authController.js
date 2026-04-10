const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// @route   POST /api/auth/register
// @desc    Register a new user
exports.registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // 1. Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // 2. Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. Create the new user
    user = new User({
      name,
      email,
      password: hashedPassword
    });

    await user.save();

    // 4. Generate a JWT Token
    const payload = { userId: user._id };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: { id: user._id, name: user.name, email: user.email, balance: user.balance }
    });

  } catch (error) {
    console.error("Registration Error:", error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // 2. Check if the password matches
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // 3. Generate the JWT Token
    const payload = { userId: user._id };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Login successful',
      token,
      user: { id: user._id, name: user.name, email: user.email, balance: user.balance }
    });

  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @route   GET /api/auth/me
// @desc    Get current logged in user's profile & balance
exports.getMe = async (req, res) => {
  try {
    // req.user.userId comes from our auth middleware!
    // .select('-password') ensures we NEVER send the hashed password back to the frontend
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error("Get Me Error:", error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @route   GET /api/auth/users
// @desc    Get all users (except the logged in user) to send money to
exports.getAllUsers = async (req, res) => {
  try {
    // $ne means "Not Equal". We don't want to send money to ourselves!
    const users = await User.find({ _id: { $ne: req.user.userId } }).select('name email');
    res.json(users);
  } catch (error) {
    console.error("Get Users Error:", error);
    res.status(500).json({ message: 'Server error fetching users' });
  }
};