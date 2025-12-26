const Match = require("../models/Match");
const Innings = require("../models/Innings");
const Player = require("../models/Player");

// STEP 1: CREATE INNINGS
exports.createInnings = async (req, res) => {
  try {
    const { matchId, battingTeam, bowlingTeam, inningsNumber } = req.body;

    const match = await Match.findById(matchId);
    if (!match) return res.status(404).json({ message: "Match not found" });

    if (![1, 2].includes(inningsNumber)) {
      return res.status(400).json({ message: "inningsNumber must be 1 or 2" });
    }

    if (
      battingTeam !== match.teamA.toString() &&
      battingTeam !== match.teamB.toString()
    ) {
      return res
        .status(400)
        .json({ message: "Batting team not part of this match" });
    }

    if (
      bowlingTeam !== match.teamA.toString() &&
      bowlingTeam !== match.teamB.toString()
    ) {
      return res
        .status(400)
        .json({ message: "Bowling team not part of this match" });
    }

    if (battingTeam === bowlingTeam) {
      return res
        .status(400)
        .json({ message: "Batting and bowling team cannot be same" });
    }

    await Innings.updateMany({ matchId }, { isActive: false });

    const newInnings = await Innings.create({
      matchId,
      battingTeam,
      bowlingTeam,
      inningsNumber,
      isActive: true,
    });

    match.innings.push(newInnings._id);
    match.currentInnings = newInnings._id;
    await match.save();

    return res.status(201).json({
      message: "Innings created successfully",
      innings: newInnings,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// STEP 2: START INNINGS
exports.startInnings = async (req, res) => {
  try {
    const { striker, nonStriker, currentBowler } = req.body;
    const inningsId = req.params.inningsId;

    const innings = await Innings.findById(inningsId);
    if (!innings) {
      return res.status(404).json({ message: "Innings not found" });
    }

    if (innings.completed) {
      return res.status(400).json({ message: "Innings already completed" });
    }

    const match = await Match.findById(innings.matchId);
    if (!match) {
      return res.status(404).json({ message: "Match not found" });
    }

    if (match.status !== "live") {
      return res
        .status(400)
        .json({ message: "Cannot start innings. Match is not live." });
    }

    // validate players
    const isStrikerValid = await Player.findOne({
      _id: striker,
      teamId: innings.battingTeam,
    });

    const isNonStrikerValid = await Player.findOne({
      _id: nonStriker,
      teamId: innings.battingTeam,
    });

    if (!isStrikerValid || !isNonStrikerValid) {
      return res.status(400).json({
        message: "Striker and Non-striker must belong to batting team",
      });
    }

    const isBowlerValid = await Player.findOne({
      _id: currentBowler,
      teamId: innings.bowlingTeam,
    });

    if (!isBowlerValid) {
      return res.status(400).json({
        message: "Bowler must belong to bowling team",
      });
    }

    innings.striker = striker;
    innings.nonStriker = nonStriker;
    innings.currentBowler = currentBowler;
    await innings.save();

    match.striker = striker;
    match.nonStriker = nonStriker;
    match.currentBowler = currentBowler;
    await match.save();

    return res.json({
      message: "Innings started successfully",
      innings,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// STEP 3: GET INNINGS 
exports.getInningsByMatchId = async (req, res) => {
  try {
    const { matchId } = req.params;

    const innings = await Innings.find({ matchId }).sort({ inningsNumber: 1 });

    // ALWAYS return array (even empty)
    return res.status(200).json(innings);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
