const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const scorer = require("../middleware/scorerMiddleware");

const {
  addCommentary,
  getCommentaryByInnings,
  getSingleCommentary
} = require("../controllers/commentaryController");

// Add commentary (Only SCORER can add)
router.post("/", auth, scorer, addCommentary);

// Public → view commentary of an innings
router.get("/innings/:inningsId", auth, getCommentaryByInnings);

// Get single commentary
router.get("/:id", auth, getSingleCommentary);

module.exports = router;
