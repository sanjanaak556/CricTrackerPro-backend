const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");

const {
  getDashboardStats,
  getMatchReport
} = require("../controllers/adminController");

const playerRoutes = require("./playerRoutes");
const teamRoutes = require("./teamRoutes");
const userRoutes = require("./userRoutes");

// ================= ADMIN ONLY =================

// Dashboard statistics
router.get("/dashboard/stats", auth, admin, getDashboardStats);

// Match report (admin view)
router.get("/matches/:id/report", auth, admin, getMatchReport);

// Player routes
router.use("/players", playerRoutes);

// Team routes
router.use("/teams", teamRoutes);

// User routes
router.use("/users", userRoutes);

module.exports = router;
