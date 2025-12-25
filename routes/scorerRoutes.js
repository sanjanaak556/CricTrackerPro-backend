const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const scorer = require("../middleware/scorerMiddleware");

const {
  getScorerDashboard,
  getScorerMatches,
  getLiveMatchData,
  startScoring,
  submitBall,
  undoLastBall,
  selectNewBatter,
  selectNewBowler
} = require("../controllers/scorerController");

// Dashboard
router.get("/dashboard", auth, scorer, getScorerDashboard);

// Assigned matches
router.get("/matches", auth, scorer, getScorerMatches);

// LIVE SCORING
router.get("/match/:matchId/live", auth, scorer, getLiveMatchData);
router.post("/match/:matchId/start", auth, scorer, startScoring);
router.post("/match/:matchId/ball", auth, scorer, submitBall);
router.post("/match/:matchId/undo", auth, scorer, undoLastBall);
router.post("/match/:matchId/new-batter", auth, scorer, selectNewBatter);
router.post("/match/:matchId/new-bowler", auth, scorer, selectNewBowler);

module.exports = router;
