const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const scorer = require("../middleware/scorerMiddleware");

const {
  createBall,
  getBallsByOver,
  getSingleBall
} = require("../controllers/ballController");

// Create ball — scorer only
router.post("/", auth, scorer, createBall);

// Get balls of over
router.get("/over/:overId", auth, getBallsByOver);

// Get single ball
router.get("/:id", auth, getSingleBall);

module.exports = router;
