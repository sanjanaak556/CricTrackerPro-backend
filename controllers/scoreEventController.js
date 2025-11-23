const ScoreEvent = require("../models/ScoreEvent");
const Match = require("../models/Match");
const Innings = require("../models/Innings");
const Over = require("../models/Over");
const Ball = require("../models/Ball");

// CREATE SCORE EVENT
exports.createScoreEvent = async (req, res) => {
  try {
    const {
      matchId,
      inningsId,
      overId,
      ballId,
      batter,
      bowler,
      eventType,
      runs,
      extraType,
      wicketType,
      description
    } = req.body;

    // Validate match, innings, over, ball
    const match = await Match.findById(matchId);
    if (!match) return res.status(404).json({ message: "Match not found" });

    const innings = await Innings.findById(inningsId);
    if (!innings) return res.status(404).json({ message: "Innings not found" });

    const over = await Over.findById(overId);
    if (!over) return res.status(404).json({ message: "Over not found" });

    const ball = await Ball.findById(ballId);
    if (!ball) return res.status(404).json({ message: "Ball not found" });

    // Create Score Event
    const newEvent = await ScoreEvent.create({
      matchId,
      inningsId,
      overId,
      ballId,
      batter,
      bowler,
      eventType,
      runs,
      extraType,
      wicketType,
      description
    });

    return res.status(201).json({
      message: "Score event created",
      scoreEvent: newEvent
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET all events for an innings
exports.getEventsByInnings = async (req, res) => {
  try {
    const inningsId = req.params.inningsId;

    const events = await ScoreEvent.find({ inningsId })
      .populate("batter bowler ballId");

    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET single event
exports.getEventById = async (req, res) => {
  try {
    const event = await ScoreEvent.findById(req.params.eventId);

    if (!event) return res.status(404).json({ message: "Not found" });

    res.json(event);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
