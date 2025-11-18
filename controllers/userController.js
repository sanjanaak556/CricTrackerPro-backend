const User = require("../models/User");
const UserRole = require("../models/UserRole");
const bcrypt = require("bcryptjs");

// GET profile (self)
exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .select("-password")
            .populate("role", "roleName");

        if (!user) return res.status(404).json({ message: "User not found" });
        if (!user.isActive) return res.status(403).json({ message: "Account is deactivated" });

        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// UPDATE profile (self)
exports.updateMe = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: "User not found" });
        if (!user.isActive) return res.status(403).json({ message: "Account is deactivated" });

        // Update fields
        if (name) user.name = name;

        if (email && email !== user.email) {
            const exists = await User.findOne({ email });
            if (exists) return res.status(400).json({ message: "Email already in use" });
            user.email = email;
        }

        if (password) {
            user.password = await bcrypt.hash(password, 10);
        }

        await user.save();

        const output = await User.findById(user._id)
            .select("-password")
            .populate("role", "roleName");

        res.json({ message: "Profile updated", user: output });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// SELF: Deactivate account
exports.deleteMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) return res.status(404).json({ message: "User not found" });

        user.isActive = false;
        await user.save();

        res.json({ message: "Your account is deactivated" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ADMIN: Get all users
exports.getUsers = async (req, res) => {
    try {
        const users = await User.find()
            .select("-password")
            .populate("role", "roleName")
            .sort({ createdAt: -1 });

        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ADMIN: Update user role
exports.updateUserRole = async (req, res) => {
    try {
        const { roleName } = req.body;

        const user = await User.findById(req.params.userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        const role = await UserRole.findOne({ roleName });
        if (!role) return res.status(400).json({ message: "Invalid role" });

        user.role = role._id;
        await user.save();

        const output = await User.findById(user._id)
            .select("-password")
            .populate("role", "roleName");

        res.json({ message: "User role updated", user: output });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ADMIN: Soft delete user
exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);

        if (!user) return res.status(404).json({ message: "User not found" });

        user.isActive = false;
        await user.save();

        res.json({ message: "User deactivated" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};



