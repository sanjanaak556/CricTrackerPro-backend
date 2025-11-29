const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const scorer = require("../middleware/scorerMiddleware");

const {
  createOver,
  getOversByInnings,
  getSingleOver,
  startOver,
  getActiveOver
} = require("../controllers/overController");

// Create new over — only scorer
router.post("/", auth, scorer, createOver);

// Get all overs of an innings
router.get("/innings/:inningsId", auth, getOversByInnings);

// Get single over
router.get("/single/:id", auth, getSingleOver);

// Start first over
router.post("/start", auth, scorer, startOver);

// Get active over
router.get("/active/:inningsId", auth, getActiveOver);

module.exports = router;

