const User = require("../models/User");
const UserRole = require("../models/UserRole");
const bcrypt = require("bcryptjs");
const uploadToCloudinary = require("../utils/uploadToCloudinary");

// ---------------------------------------------------------
// GET profile (self)
// ---------------------------------------------------------
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

// ---------------------------------------------------------
// UPDATE profile (self) including profile image
// ---------------------------------------------------------
exports.updateMe = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: "User not found" });
        if (!user.isActive) return res.status(403).json({ message: "Account is deactivated" });

        // Update Name
        if (name) user.name = name;

        // Update Email
        if (email && email !== user.email) {
            const exists = await User.findOne({ email });
            if (exists) return res.status(400).json({ message: "Email already in use" });
            user.email = email;
        }

        // Update Password
        if (password) {
            user.password = await bcrypt.hash(password, 10);
        }

        // Update Profile Image (if new image uploaded)
        if (req.file) {
            const uploaded = await uploadToCloudinary(req.file.buffer, "user_profiles");
            user.profileImage = uploaded.secure_url;
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

// ---------------------------------------------------------
// DELETE profile image only (self)
// ---------------------------------------------------------
exports.deleteProfileImage = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) return res.status(404).json({ message: "User not found" });

        user.profileImage = null;
        await user.save();

        res.json({ message: "Profile image removed successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ---------------------------------------------------------
// SELF: Deactivate account
// ---------------------------------------------------------
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

// ---------------------------------------------------------
// ADMIN: Get all users
// ---------------------------------------------------------
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

// ---------------------------------------------------------
// ADMIN: Update user role + update username only
// ---------------------------------------------------------
exports.updateUserRole = async (req, res) => {
    try {
        const { roleName, name } = req.body;

        const user = await User.findById(req.params.userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        // Admin can update ONLY name (username)
        if (name) user.name = name;

        // Update role (viewer → scorer/admin)
        if (roleName) {
            const role = await UserRole.findOne({ roleName });
            if (!role) return res.status(400).json({ message: "Invalid role" });
            user.role = role._id;
        }

        await user.save();

        const output = await User.findById(user._id)
            .select("-password")
            .populate("role", "roleName");

        res.json({ message: "User updated", user: output });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ---------------------------------------------------------
// ADMIN: Soft delete user
// ---------------------------------------------------------
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