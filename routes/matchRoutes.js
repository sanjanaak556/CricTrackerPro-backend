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
    abandonMatch,
    assignScorer,
    updateLiveScore,
    getPublicLiveMatches,
    getMatchPlayers,
    getActiveMatchForScorer,
    getLoggedInLiveMatches
} = require("../controllers/matchController");

// Create match (admin only)
router.post("/", auth, admin, createMatch);

// Get all matches (any logged-in user)
router.get("/", auth, getAllMatches);

// Get active scorer
router.get("/scorer/active", auth, scorer, getActiveMatchForScorer);

// Public minimal live section (no auth)
router.get("/public/live", getPublicLiveMatches);

// live matches (with auth)
router.get("/live", auth, getLoggedInLiveMatches);

// Get match players
router.get("/:matchId/players", auth, getMatchPlayers);

// Update match (admin only)
router.put("/:matchId", auth, scorer, updateMatch);

// Soft delete match (admin only)
router.delete("/:matchId", auth, admin, deleteMatch);

// Start match (admin or scorer)
router.put("/:matchId/start", auth, scorer, startMatch);

// Complete match (admin or scorer)
router.put("/:matchId/complete", auth, scorer, completeMatch);

// Abandon match (admin or scorer)
router.put("/:matchId/abandon", auth, scorer, abandonMatch);

// Assign scorer (admin only)
router.put("/:matchId/assign-scorer", auth, admin, assignScorer);

// Update live score (scorer only)
router.put("/:matchId/live-score", auth, scorer, updateLiveScore);

// Get match by ID
router.get("/:matchId", auth, getMatchById);


module.exports = router;


