const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// 🔹 Register
exports.register = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 🔒 Validation
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // 🔍 Normalize email (IMPORTANT)
    const normalizedEmail = email.toLowerCase();

    // 🔍 Check if user exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    // 🔐 Hash password
    const hashed = await bcrypt.hash(password, 10);

    // 💾 Save user
    const user = new User({
      email: normalizedEmail,
      password: hashed
    });

    await user.save();

    res.status(201).json({ message: "User registered ✅" });

  } catch (err) {
    console.error("Register Error ❌:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};


// 🔹 Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 🔒 Validation
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const normalizedEmail = email.toLowerCase();

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ error: "Wrong password" });
    }

    // 🔐 JWT Token
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({ token });

  } catch (err) {
    console.error("Login Error ❌:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};