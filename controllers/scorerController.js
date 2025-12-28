const Match = require("../models/Match");
const Ball = require("../models/Ball");
const Over = require("../models/Over");
const Innings = require("../models/Innings");
const { processBall } = require("../services/scoreEngine");

/* =========================================================
   SCORER DASHBOARD
========================================================= */
exports.getScorerDashboard = async (req, res) => {
  try {
    const scorerId = req.user.id || req.user._id;

    const now = new Date();
    const startOfDay = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    );
    const endOfDay = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        23,
        59,
        59,
        999
      )
    );

    const matches = await Match.find({
      scorerId,
      isActive: true,
    })
      .populate("teamA", "name logo")
      .populate("teamB", "name logo")
      .populate("scorerId", "name")
      .select("teamA teamB matchType venue status scheduledAt overs scorerId")
      .sort({ scheduledAt: -1 })
      .lean();

    const totalMatches = matches.length;
    const liveMatches = matches.filter((m) => m.status === "live").length;
    const completedMatches = matches.filter(
      (m) => m.status === "completed"
    ).length;

    const todayMatches = matches.filter(
      (m) => m.scheduledAt >= startOfDay && m.scheduledAt <= endOfDay
    );

    const liveMatch = matches.find((m) => m.status === "live") || null;

    res.status(200).json({
      scorerName: matches[0]?.scorerId?.name || "Scorer",
      stats: {
        totalMatches,
        liveMatches,
        completedMatches,
        todayMatches: todayMatches.length,
      },
      liveMatch,
      assignedMatches: matches,
    });
  } catch (error) {
    console.error("Scorer Dashboard Error:", error);
    res.status(500).json({ message: "Failed to load scorer dashboard" });
  }
};

/* =========================================================
   ALL MATCHES ASSIGNED TO SCORER
========================================================= */
exports.getScorerMatches = async (req, res) => {
  try {
    const scorerId = req.user.id || req.user._id;

    const matches = await Match.find({
      scorerId,
      isActive: true,
    })
      .sort({ status: 1, scheduledAt: 1 })
      .populate("teamA", "name shortName logo")
      .populate("teamB", "name shortName logo")
      .populate("tossWinner", "name shortName")
      .select(`
        matchNumber
        matchName
        matchType
        teamA
        teamB
        tossWinner
        electedTo
        status
        scheduledAt
        venue
        currentScore
      `);

    res.json(matches);
  } catch (err) {
    console.error("Scorer matches error:", err);
    res.status(500).json({ message: "Failed to load scorer matches" });
  }
};

/* ================= START INNINGS ================= */
exports.startInnings = async (req, res) => {
  const { matchId, battingTeam, bowlingTeam, striker, nonStriker, bowler } = req.body;

  const match = await Match.findById(matchId);
  if (!match) {
    return res.status(404).json({ message: "Match not found" });
  }

  // Determine the innings number
  let inningsNumber = 1;
  if (match.currentInnings) {
    const currentInnings = await Innings.findById(match.currentInnings);
    if (currentInnings && currentInnings.completed) {
      inningsNumber = 2; // Start second innings if first is completed
    } else {
      inningsNumber = currentInnings.inningsNumber;
    }
  }

  let innings = await Innings.findOne({
    matchId,
    inningsNumber,
    isActive: true
  });

  if (!innings) {
    // Create innings if not exists
    innings = await Innings.create({
      matchId,
      battingTeam,
      bowlingTeam,
      inningsNumber,
      isActive: true,
    });
    match.innings.push(innings._id);
    match.currentInnings = innings._id;
    await match.save();
  }

  innings.striker = striker;
  innings.nonStriker = nonStriker;
  innings.currentOverId = null; // Reset over state for new innings start
  innings.currentBowler = null;
  await innings.save();

  // Update match with current innings
  match.currentInnings = innings._id;
  match.striker = striker;
  match.nonStriker = nonStriker;
  await match.save();

  // Emit socket event for innings started
  const io = require("../services/socket").getIO();
  const populatedInnings = await Innings.findById(innings._id)
    .populate("battingTeam", "name")
    .populate("bowlingTeam", "name")
    .populate("striker", "name")
    .populate("nonStriker", "name");

  io.to(`match_${matchId}`).emit("inningsStarted", {
    innings: populatedInnings
  });

  // Emit live score update for the new innings
  io.to(`match_${match._id}`).emit("liveScoreUpdate", {
    runs: populatedInnings.totalRuns,
    wickets: populatedInnings.totalWickets,
    overs: populatedInnings.totalOvers,
    battingTeam: populatedInnings.battingTeam,
    bowlingTeam: populatedInnings.bowlingTeam,
    striker: populatedInnings.striker,
    nonStriker: populatedInnings.nonStriker,
    currentBowler: populatedInnings.currentBowler,
    fallOfWickets: populatedInnings.fallOfWickets,
    strikerRuns: 0,
    strikerBalls: 0,
    nonStrikerRuns: 0,
    nonStrikerBalls: 0,
    bowlerOvers: "0.0",
    bowlerRuns: 0,
    bowlerWickets: 0
  });

  res.json({ success: true });
};

/* ================= START OVER ================= */
exports.startOver = async (req, res) => {
  const { inningsId, bowler, overNumber } = req.body;

  const over = await Over.create({
    inningsId,
    matchId: req.params.matchId,
    overNumber,
    bowler,
    balls: []
  });

  await Innings.findByIdAndUpdate(inningsId, {
    currentBowler: bowler,
    currentOverId: over._id
  });

  res.json(over);
};

/* ================= SUBMIT BALL ================= */
exports.submitBall = async (req, res) => {
  try {
    const ballData = req.body;
    // Ensure fielder and dismissedBatsman are included if wicket
    if (ballData.isWicket) {
      ballData.fielder = ballData.fielder || null;
      ballData.dismissedBatsman = ballData.dismissedBatsman || ballData.striker; // Default to striker if not specified
    }

    // If bowler is not provided or null, fetch it from the over
    if (!ballData.bowler) {
      const over = await Over.findById(ballData.overId);
      if (over) {
        ballData.bowler = over.bowler;
      }
    }

    const ball = await Ball.create(ballData);
    await processBall(ball);
    res.json({ success: true });
  } catch (err) {
    console.error("Ball submit error:", err);
    res.status(500).json({ message: "Failed to submit ball" });
  }
};

/* ================= UNDO BALL ================= */
exports.undoLastBall = async (req, res) => {
  const { reverseProcessBall } = require("../services/scoreEngine");

  const lastBall = await Ball.findOne({
    matchId: req.params.matchId
  }).sort({ createdAt: -1 });

  if (!lastBall) {
    return res.status(400).json({ message: "No ball to undo" });
  }

  // Reverse the score changes before deleting the ball
  await reverseProcessBall(lastBall);

  // Delete the ball from database
  await lastBall.deleteOne();

  res.json({ success: true });
};

/* ================= SET NEW BATTER ================= */
exports.newBatter = async (req, res) => {
  const { matchId, playerId, wicketType } = req.body;

  try {
    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({ message: "Match not found" });
    }

    const innings = await Innings.findById(match.currentInnings);
    if (!innings) {
      return res.status(404).json({ message: "Current innings not found" });
    }

    // Update the striker with the new batter
    innings.striker = playerId;
    await innings.save();

    // Update match striker as well
    match.striker = playerId;
    await match.save();

    res.json({ success: true });
  } catch (err) {
    console.error("New batter error:", err);
    res.status(500).json({ message: "Failed to set new batter" });
  }
};




