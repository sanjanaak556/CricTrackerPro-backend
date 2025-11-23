const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");
const scorer = require("../middleware/scorerMiddleware");

const {
    createMatch,
    getAllMatches,
    getMatchById,
    updateMatch,
    deleteMatch,
    startMatch,
    completeMatch,
    assignScorer,
    updateLiveScore,
    getPublicLiveMatches
} = require("../controllers/matchController");

// Create match (admin only)
router.post("/", auth, admin, createMatch);

// Get all matches (any logged-in user)
router.get("/", auth, getAllMatches);

// Get live score (minimal) for public (NO auth) — keep this BEFORE param route
router.get("/public/live", getPublicLiveMatches);

// Get match by ID
router.get("/:matchId", auth, getMatchById);

// Update match (admin only)
router.put("/:matchId", auth, admin, updateMatch);

// Soft delete match (admin only)
router.delete("/:matchId", auth, admin, deleteMatch);

// Start match (admin or scorer)
router.put("/:matchId/start", auth, scorer, startMatch);

// Complete match (admin or scorer)
router.put("/:matchId/complete", auth, scorer, completeMatch);

// Assign scorer (admin only)
router.put("/:matchId/assign-scorer", auth, admin, assignScorer);

// Update live score (scorer only)
router.put("/:matchId/live-score", auth, scorer, updateLiveScore);

module.exports = router;

