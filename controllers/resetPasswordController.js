const bcrypt = require("bcryptjs");

exports.resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ message: "User not found" });

    const salt = await bcrypt.genSalt();
    const hashed = await bcrypt.hash(newPassword, salt);

    user.password = hashed;
    user.otp = undefined;
    user.otpExpiry = undefined;

    await user.save();

    res.json({ message: "Password reset successful" });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
