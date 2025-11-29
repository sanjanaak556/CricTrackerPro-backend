const Ball = require("../models/Ball");
const Innings = require("../models/Innings");
const Over = require("../models/Over");
const Match = require("../models/Match");
const Player = require("../models/Player");
const { processBall } = require("../services/scoreEngine");

// ------------------------------------------------------
// 1. CREATE BALL
// ------------------------------------------------------
exports.createBall = async (req, res) => {
  console.log("🎾 CREATE BALL HIT");
  console.log("BODY:", req.body);
  console.log("USER:", req.user);
  try {
    const {
      matchId,
      inningsId,
      overId,
      striker,
      nonStriker,
      bowler,
      runs,
      extraType,
      isWicket
    } = req.body;

    // Validate match
    const match = await Match.findById(matchId);
    if (!match) return res.status(404).json({ error: "Match not found" });

    // Validate innings
    const innings = await Innings.findById(inningsId);
    if (!innings) return res.status(404).json({ error: "Innings not found" });

    // Validate over
    const over = await Over.findById(overId);
    if (!over) return res.status(404).json({ error: "Over not found" });

    // Validate players
    const s = await Player.findById(striker);
    const ns = await Player.findById(nonStriker);
    const bw = await Player.findById(bowler);

    if (!s || !ns || !bw)
      return res.status(400).json({ error: "Invalid player(s)" });

    // Calculate legal/non-legal delivery
    const isLegalDelivery =
      extraType !== "wide" && extraType !== "noball";

    // Auto ball number
    const existingBalls = await Ball.find({ overId });
    const ballNumber = existingBalls.length + 1;

    // Create Ball
    const newBall = await Ball.create({
      matchId,
      inningsId,
      overId,
      ballNumber,
      striker,
      nonStriker,
      bowler,
      runs,
      extraType,
      isLegalDelivery,
      isWicket
    });

    // Hand over to Score Engine
    await processBall(newBall);

    return res.status(201).json({
      message: "Ball added successfully",
      ball: newBall
    });

  } catch (err) {
    console.log("❌ Ball create error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ------------------------------------------------------
// 2. GET BALLS BY OVER
// ------------------------------------------------------
exports.getBallsByOver = async (req, res) => {
  try {
    const { overId } = req.params;

    const balls = await Ball.find({ overId })
      .populate("striker", "name")
      .populate("nonStriker", "name")
      .populate("bowler", "name");

    res.json({ balls });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ------------------------------------------------------
// 3. GET SINGLE BALL
// ------------------------------------------------------
exports.getSingleBall = async (req, res) => {
  try {
    const ball = await Ball.findById(req.params.id)
      .populate("striker", "name")
      .populate("nonStriker", "name")
      .populate("bowler", "name");

    if (!ball)
      return res.status(404).json({ error: "Ball not found" });

    res.json({ ball });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

