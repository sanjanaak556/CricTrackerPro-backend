const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");
const scorer = require("../middleware/scorerMiddleware");

const {
  createMatchSummary,
  listAllSummaries,
  getSummaryByMatch,
  getSummaryById,
  downloadMatchSummaryPDF,
  updateMatchSummary,
  autoGenerateSummary,
} = require("../controllers/matchSummaryController");

// Create (Admin only)
router.post("/", auth, admin, createMatchSummary);

// List all summaries
router.get("/", auth, admin, listAllSummaries);

//  Auto generate summary
router.post("/auto-generate/:matchId", auth, admin, autoGenerateSummary);

// Get summary by ID
router.get("/summary/:id", auth, getSummaryById);

// Download summary as PDF
router.get("/:matchId/pdf", downloadMatchSummaryPDF);

// Get summary for a match
router.get("/:matchId", auth, getSummaryByMatch);

// Update summary (Admin only)
router.put("/:matchId", auth, admin, updateMatchSummary);

module.exports = router;
