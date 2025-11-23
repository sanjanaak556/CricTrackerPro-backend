const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const scorer = require("../middleware/scorerMiddleware");

const {
  createScoreEvent,
  getEventsByInnings,
  getEventById
} = require("../controllers/scoreEventController");

// SCORER ONLY → add event
router.post("/", auth, scorer, createScoreEvent);

// Anyone logged in can view events
router.get("/innings/:inningsId", auth, getEventsByInnings);
router.get("/:eventId", auth, getEventById);

module.exports = router;

