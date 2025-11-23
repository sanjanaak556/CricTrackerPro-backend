const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");

const {
  createMatchSummary,
  getSummaryByMatch,
  downloadMatchSummaryPDF,
  updateMatchSummary
} = require("../controllers/matchSummaryController");

// Create (Admin only)
router.post("/", auth, admin, createMatchSummary);

// Get summary for a match
router.get("/:matchId", auth, getSummaryByMatch);

// Download summary as PDF
router.get("/:matchId/pdf", auth, downloadMatchSummaryPDF);

// Update summary (Admin only)
router.put("/:matchId", auth, admin, updateMatchSummary);

module.exports = router;
