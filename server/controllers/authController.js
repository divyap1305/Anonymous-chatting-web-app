// controllers/authController.js
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Helper to generate JWT
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

// @route   POST /api/auth/register
// @desc    Register new user
// @access  Public
const register = async (req, res) => {
  try {
    const { name, email, password, mentorCode, role } = req.body;

    // Basic validation
    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "Name, email and password are required" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User with this email already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Default role = student
    let userRole = "student";

    // If mentorCode matches secret, promote to TEACHER
    if (mentorCode && mentorCode === process.env.MENTOR_CODE) {
      userRole = "teacher";
    }

    // Allow ADMIN only when we explicitly send role="admin" from trusted tools
    if (role === "admin") {
      userRole = "admin";
    }

    // Create user
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: userRole,
      isVerified: true, // you can later make this false and verify manually
    });

    const token = generateToken(user);

    return res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
      },
    });
  } catch (err) {
    console.error("Register error:", err.message);
    return res
      .status(500)
      .json({ message: "Server error during registration" });
  }
};

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Basic validation
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res
        .status(400)
        .json({ message: "Invalid email or password" });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ message: "Invalid email or password" });
    }

    const token = generateToken(user);

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
      },
    });
  } catch (err) {
    console.error("Login error:", err.message);
    return res.status(500).json({ message: "Server error during login" });
  }
};

// @route   GET /api/auth/me
// @desc    Get current logged-in user
// @access  Private
const getMe = async (req, res) => {
  try {
    // req.user is set in auth middleware
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    return res.status(200).json({
      user: req.user,
    });
  } catch (err) {
    console.error("GetMe error:", err.message);
    return res
      .status(500)
      .json({ message: "Server error fetching user" });
  }
};

module.exports = {
  register,
  login,
  getMe,
};
