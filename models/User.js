const mongoose = require("mongoose");
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: mongoose.Schema.Types.ObjectId, ref: "UserRole", required: true },
    isActive: { type: Boolean, default: true },
    otp: { type: String },
    otpExpiry: { type: Date }
  },
  { timestamps: true }
);

userSchema.index({ email: 1 });
module.exports = mongoose.model("User", userSchema);

