const Match = require("../models/Match");
const Innings = require("../models/Innings");
const Over = require("../models/Over");
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

/* =========================================================
   GET LIVE MATCH DATA
========================================================= */
exports.getLiveMatchData = async (req, res) => {
  try {
    const { matchId } = req.params;

    const match = await Match.findById(matchId)
      .populate("teamA teamB scorerId");

    if (!match) {
      return res.status(404).json({ message: "Match not found" });
    }

    const innings = await Innings.findOne({
      matchId,
      isActive: true,
    })
      .populate("striker nonStriker currentBowler");

    res.json({
      match,
      innings,
      needsStart: !innings,
    });
  } catch (err) {
    console.error("Live match load error:", err);
    res.status(500).json({ message: "Failed to load live match" });
  }
};

/* =========================================================
   START SCORING
========================================================= */
exports.startScoring = async (req, res) => {
  try {
    const { matchId } = req.params;

    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({ message: "Match not found" });
    }

    let innings = await Innings.findOne({
      matchId,
      inningsNumber: 1,
      isActive: true,
    });

    if (!innings) {
      innings = await Innings.create({
        matchId,
        battingTeam: match.teamA,
        bowlingTeam: match.teamB,
        inningsNumber: 1,
        isActive: true,
      });
    }

    match.status = "live";
    await match.save();

    res.json({
      message: "Scoring started",
      innings,
    });
  } catch (err) {
    console.error("Start scoring error:", err);
    res.status(500).json({ message: "Failed to start scoring" });
  }
};

/* =========================================================
   SUBMIT BALL
========================================================= */
exports.submitBall = async (req, res) => {
  try {
    const { matchId } = req.params;
    const payload = req.body;

    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({ message: "Match not found" });
    }

    const innings = await Innings.findOne({
      matchId,
      isActive: true,
    });

    if (!innings) {
      return res.status(400).json({
        message: "Scoring not started yet",
      });
    }

    await processBall({
      match,
      innings,
      ...payload,
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Submit ball error:", err);
    res.status(500).json({ message: "Failed to submit ball" });
  }
};

/* =========================================================
   UNDO LAST BALL (PLACEHOLDER)
========================================================= */
exports.undoLastBall = async (req, res) => {
  res.json({ message: "Undo logic will be added in next phase" });
};

/* =========================================================
   SELECT NEW BATTER (PLACEHOLDER)
========================================================= */
exports.selectNewBatter = async (req, res) => {
  res.json({ message: "New batter selected" });
};

/* =========================================================
   SELECT NEW BOWLER (PLACEHOLDER)
========================================================= */
exports.selectNewBowler = async (req, res) => {
  res.json({ message: "New bowler selected" });
};
