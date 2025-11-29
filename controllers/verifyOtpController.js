const User = require("../models/User");

exports.verifyOtp = async (req, res) => {
    try {
      const { email, otp } = req.body;
  
      const user = await User.findOne({ email });
  
      if (!user) return res.status(404).json({ message: "User not found" });
  
      if (user.otp !== otp)
        return res.status(400).json({ message: "Invalid OTP" });
  
      if (user.otpExpiry < Date.now())
        return res.status(400).json({ message: "OTP expired" });
  
      res.json({ message: "OTP verified" });
  
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
  