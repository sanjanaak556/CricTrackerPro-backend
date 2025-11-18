const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");
const userController = require("../controllers/userController");

// self- routes
router.get("/me", auth, userController.getMe);
router.put("/me", auth, userController.updateMe);
router.delete("/me", auth, userController.deleteMe);

// admin
router.get("/", auth, admin, userController.getUsers);
router.patch("/:userId/role", auth, admin, userController.updateUserRole);
router.delete("/:userId", auth, admin, userController.deleteUser);

module.exports = router;

