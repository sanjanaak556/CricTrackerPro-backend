const Ball = require("../models/Ball");
const Innings = require("../models/Innings");
const Over = require("../models/Over");
const Player = require("../models/Player");

//1. CREATE BALL
exports.createBall = async (req, res) => {
  try {
    const {
      inningsId,
      overId,
      striker,
      nonStriker,
      bowler,
      runs,
      extraType,
      isLegalDelivery,
      isWicket
    } = req.body;

    // Validate innings
    const innings = await Innings.findById(inningsId);
    if (!innings) {
      return res.status(404).json({ error: "Innings not found" });
    }

    // Validate over
    const over = await Over.findById(overId);
    if (!over) {
      return res.status(404).json({ error: "Over not found" });
    }

    // Validate players
    const strikerPlayer = await Player.findById(striker);
    const nonStrikerPlayer = await Player.findById(nonStriker);
    const bowlerPlayer = await Player.findById(bowler);

    if (!strikerPlayer || !nonStrikerPlayer || !bowlerPlayer) {
      return res.status(400).json({ error: "Invalid player(s) provided" });
    }

    // Auto-calculate ball number
    const existingBalls = await Ball.find({ overId });
    const ballNumber = existingBalls.length + 1;

    const newBall = await Ball.create({
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

    // Add ball to over document
    over.balls.push(newBall._id);
    await over.save();

    // Update innings
    innings.totalRuns += runs;
    if (isWicket) innings.totalWickets += 1;

    // Update overs only on legal delivery
    if (isLegalDelivery) {
      const [ov, ball] = innings.totalOvers.split(".").map(Number);
      if (ball === 5) {
        innings.totalOvers = `${ov + 1}.0`;
      } else {
        innings.totalOvers = `${ov}.${ball + 1}`;
      }
    }

    await innings.save();

    return res.status(201).json({
      message: "Ball added successfully",
      ball: newBall
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

//2. Get all balls of an over
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

//3. Get single ball
exports.getSingleBall = async (req, res) => {
  try {
    const ball = await Ball.findById(req.params.id)
      .populate("striker", "name")
      .populate("nonStriker", "name")
      .populate("bowler", "name");

    if (!ball) return res.status(404).json({ error: "Ball not found" });

    res.json({ ball });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

