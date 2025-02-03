// controllers/authController.js
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
require("dotenv").config({ path: ".env.development" });

//console.log("Loaded JWT_SECRET:", process.env.JWT_SECRET);

exports.register = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("The Requst body:", req.body);

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "User already exists" });

    const newUser = new User({ email, passwordHash: password });
    await newUser.save();

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

//Login
exports.login = async (req, res) => {
  try {
    console.log("Request Body:", req.body); // ✅ Log request data

    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      console.warn("User not found for email:", email);
      return res.status(400).json({ message: "Invalid credentials" });
    }

    console.log("User Found:", user);

    if (!user.passwordHash) {
      console.error("No password hash stored for user:", user._id);
      return res.status(500).json({ message: "Password data missing" });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    console.log("Password Match:", isMatch);

    if (!isMatch) {
      console.warn("Invalid password attempt for user:", user._id);
      return res.status(400).json({ message: "Invalid credentials" });
    }

    console.log("Generating JWT...");
    if (!process.env.JWT_SECRET) {
      throw new Error("Missing JWT_SECRET in environment variables");
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    res.json({
      token,
      message: "Login successful!",
      user: {
        id: user._id,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
