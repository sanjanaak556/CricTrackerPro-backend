const express = require("express");
const router = express.Router();

const { sendOtp } = require("../controllers/sendOtpController");
const { verifyOtp } = require("../controllers/verifyOtpController");
const { resetPassword } = require("../controllers/resetPasswordController");

const auth = require("../middleware/authMiddleware");

const {
  register,
  login,
  logout,
  changePassword,
} = require("../controllers/authController");

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.put("/change-password", auth, changePassword);

router.post("/forgot-password/send-otp", sendOtp);
router.post("/forgot-password/verify-otp", verifyOtp);
router.post("/forgot-password/reset", resetPassword);

module.exports = router;
