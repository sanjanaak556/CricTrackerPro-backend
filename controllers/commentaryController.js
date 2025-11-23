const Commentary = require("../models/Commentary");
const Match = require("../models/Match");
const Innings = require("../models/Innings");
const Over = require("../models/Over");
const Ball = require("../models/Ball");

// Create Commentary (SCORER only)
exports.addCommentary = async (req, res) => {
  try {
    const {
      matchId,
      inningsId,
      overId,
      ballId,
      text,
      type
    } = req.body;

    // Validate structure links
    const match = await Match.findById(matchId);
    if (!match) return res.status(404).json({ message: "Match not found" });

    const innings = await Innings.findById(inningsId);
    if (!innings) return res.status(404).json({ message: "Innings not found" });

    if (innings.matchId.toString() !== matchId)
      return res.status(400).json({ message: "Innings does not belong to this match" });

    const over = await Over.findById(overId);
    if (!over) return res.status(404).json({ message: "Over not found" });

    if (over.inningsId.toString() !== inningsId)
      return res.status(400).json({ message: "Over does not belong to this innings" });

    const ball = await Ball.findById(ballId);
    if (!ball) return res.status(404).json({ message: "Ball not found" });

    if (ball.overId.toString() !== overId)
      return res.status(400).json({ message: "Ball does not belong to this over" });

    const commentary = await Commentary.create({
      matchId,
      inningsId,
      overId,
      ballId,
      text,
      type,
      createdBy: req.user._id
    });

    return res.status(201).json({
      message: "Commentary added",
      commentary
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

//  Get commentary by innings
exports.getCommentaryByInnings = async (req, res) => {
  try {
    const inningsId = req.params.inningsId;

    const commentary = await Commentary.find({ inningsId })
      .sort({ createdAt: 1 })
      .populate("createdBy", "name");

    res.status(200).json({ commentary });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single commentary
exports.getSingleCommentary = async (req, res) => {
  try {
    const commentary = await Commentary.findById(req.params.id);

    if (!commentary) {
      return res.status(404).json({ message: "Commentary not found" });
    }

    res.status(200).json({ commentary });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

