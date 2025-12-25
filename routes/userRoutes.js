const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");
const upload = require("../utils/upload");


const {
  getMe,
  updateMe,
  deleteMe,
  deleteProfileImage,
  getUsers,
  updateUserRole,
  deleteUser,
} = require("../controllers/userController");

// User routes
router.get("/me", auth, getMe);
router.put("/me", auth, upload.single("image"), updateMe);
router.delete("/me/image", auth, deleteProfileImage);
router.delete("/me", auth, deleteMe);

// Admin routes
router.get("/", auth, admin, getUsers);
router.patch("/:userId/role", auth, admin, updateUserRole);
router.delete("/:userId", auth, admin, deleteUser);

module.exports = router;