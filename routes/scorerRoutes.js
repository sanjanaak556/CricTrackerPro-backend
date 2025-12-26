const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const scorer = require("../middleware/scorerMiddleware");

const {
  getScorerDashboard,
  getScorerMatches,
  startInnings,
  startOver,
  submitBall,
  undoLastBall
} = require("../controllers/scorerController");

// Dashboard
router.get("/dashboard", auth, scorer, getScorerDashboard);

// Assigned matches
router.get("/matches", auth, scorer, getScorerMatches);

router.post("/start-innings", auth, scorer, startInnings);
router.post("/start-over/:matchId", auth, scorer, startOver);
router.post("/ball", auth, scorer, submitBall);
router.post("/undo/:matchId", auth, scorer, undoLastBall);


module.exports = router;
