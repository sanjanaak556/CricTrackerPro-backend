const express = require("express");
const router = express.Router();
const { register, login, logout } = require("../controllers/authController");
const { sendOtp } = require("../controllers/sendOtpController");
const { verifyOtp } = require("../controllers/verifyOtpController");
const { resetPassword } = require("../controllers/resetPasswordController");

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);

router.post("/forgot-password/send-otp", sendOtp);
router.post("/forgot-password/verify-otp", verifyOtp);
router.post("/forgot-password/reset", resetPassword);


module.exports = router;

