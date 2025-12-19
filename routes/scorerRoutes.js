const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const scorer = require("../middleware/scorerMiddleware");

const { getScorerDashboard, getScorerMatches } = require("../controllers/scorerController");

// scorer dashboard
router.get("/dashboard", auth, scorer, getScorerDashboard);
// get all matches assigned by scorer
router.get("/matches", auth, scorer, getScorerMatches)
module.exports = router;
