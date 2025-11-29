const Over = require("../models/Over");
const Innings = require("../models/Innings");
const Player = require("../models/Player");

exports.createOver = async (req, res) => {
  try {
    const { inningsId, bowler, matchId } = req.body;

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

    // Find last over of this innings
    const lastOver = await Over.find({ inningsId })
      .sort({ overNumber: -1 })
      .limit(1);

    const nextOverNumber =
      lastOver.length > 0 ? lastOver[0].overNumber + 1 : 1;

    // Create new Over
    const newOver = await Over.create({
      matchId,
      inningsId,
      overNumber: nextOverNumber,
      bowler,
      balls: []
    });

    // 🔥 IMPORTANT — UPDATE ACTIVE OVER
    innings.currentOverId = newOver._id;
    await innings.save();

    return res.status(201).json({
      message: "Over created successfully",
      over: newOver
    });

  } catch (error) {
    console.error(error);
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

// 4. START FIRST OVER
exports.startOver = async (req, res) => {
  try {
    const { inningsId, bowler } = req.body;

    const innings = await Innings.findById(inningsId);
    if (!innings) return res.status(404).json({ error: "Innings not found" });

    // Determine next over number
    const existingOvers = await Over.find({ inningsId });
    const overNumber = existingOvers.length + 1; // 1,2,3,...

    const newOver = await Over.create({
      matchId: innings.matchId,
      inningsId,
      overNumber,
      bowler,
      balls: []
    });

    innings.currentOverId = newOver._id;
    await innings.save();

    return res.status(201).json({
      message: "Over started",
      over: newOver
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 5. GET ACTIVE OVER
exports.getActiveOver = async (req, res) => {
  debugger
  try {
    const { inningsId } = req.params;

    const innings = await Innings.findById(inningsId);
    if (!innings) {
      return res.status(404).json({ error: "Innings not found" });
    }
    console.log(innings)
    if (!innings.currentOverId) {
      return res.json({ activeOver: null });
    }

    const over = await Over.findById(innings.currentOverId);

    return res.json({ activeOver: over });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};




