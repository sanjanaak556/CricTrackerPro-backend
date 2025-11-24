const User = require("../models/User");
const nodemailer = require("nodemailer");

exports.sendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User does not exist" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = Date.now() + 2 * 60 * 1000; // 2 minutes

    user.otp = otp;
    user.otpExpiry = expiry;
    await user.save();

    // Email transport
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_ID,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_ID,
      to: email,
      subject: "Your OTP for Password Reset",
      text: `Your OTP is ${otp}. It expires in 2 minutes.`,
    });

    res.json({ message: "OTP sent to your email" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
