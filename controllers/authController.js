const User = require("../models/User");
const UserRole = require("../models/UserRole");
const bcrypt = require("bcryptjs");
const generateToken = require("../utils/generateToken");

// REGISTER (auto-assign viewer)
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Missing fields" });  // Basic validation
    }
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "User already exists" });   // Check if email already exists
    }

    // Always assign default "viewer" role
    const defaultRole = await UserRole.findOne({ roleName: "viewer" });
    if (!defaultRole) {
      return res.status(500).json({ message: "Default role 'viewer' is missing in DB" });
    }
    const hashed = await bcrypt.hash(password, 10);    // Hash password

    // Create user
    const user = new User({
      name,
      email,
      password: hashed,
      role: defaultRole._id,   // Auto assign viewer
    });
    await user.save();
    await user.populate("role", "roleName");
    res.status(201).json({
      message: "Registration successful",
      token: generateToken(user),
      user,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// LOGIN
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).populate("role", "roleName");
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ message: "Invalid credentials" });  // Validate password
    }
    res.json({
      message: "Login successful",
      token: generateToken(user),
      user,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// LOGOUT
exports.logout = (req, res) => {
  res.json({ message: "Logout successful" });
};




