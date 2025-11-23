const Over = require("../models/Over");
const Innings = require("../models/Innings");
const Player = require("../models/Player");

//1. Create new over
exports.createOver = async (req, res) => {
  try {
    const { inningsId, overNumber, bowler } = req.body;

    // Validate innings
    const innings = await Innings.findById(inningsId);
    if (!innings) {
      return res.status(404).json({ error: "Innings not found" });
    }

    // Validate bowler
    const bowlerPlayer = await Player.findById(bowler);
    if (!bowlerPlayer) {
      return res.status(404).json({ error: "Bowler not found" });
    }

    //  defensive check: require overNumber >= 1
    if (typeof overNumber !== "number" || overNumber < 1) {
      return res.status(400).json({ error: "Invalid overNumber (must be >= 1)" });
    }

    // Create Over
    const newOver = await Over.create({
      inningsId,
      overNumber,
      bowler
    });

    return res.status(201).json({
      message: "Over created successfully",
      over: newOver
    });

  } catch (error) {
    console.error(error);

    // Handle duplicate overNumber (unique index) more gracefully
    if (error.code === 11000) {
      return res.status(400).json({ error: "Over number already exists for this innings" });
    }

    res.status(500).json({ error: "Internal server error" });
  }
};

//2. Get all overs of a specific innings
exports.getOversByInnings = async (req, res) => {
  try {
    const { inningsId } = req.params;

    const overs = await Over.find({ inningsId })
      .populate("bowler", "name")
      .populate({
        path: "balls",
        populate: [
          { path: "striker", select: "name" },
          { path: "nonStriker", select: "name" },
          { path: "bowler", select: "name" }
        ]
      })
      .sort({ overNumber: 1 });

    return res.status(200).json({ overs });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

//3. Get single over
exports.getSingleOver = async (req, res) => {
  try {
    const { id } = req.params;

    const over = await Over.findById(id)
      .populate("bowler", "name")
      .populate({
        path: "balls",
        populate: [
          { path: "striker", select: "name" },
          { path: "nonStriker", select: "name" },
          { path: "bowler", select: "name" }
        ]
      });

    if (!over) {
      return res.status(404).json({ error: "Over not found" });
    }

    return res.status(200).json({ over });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};


