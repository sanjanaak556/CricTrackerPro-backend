const Match = require("../models/Match");

// GET /api/scorer/dashboard
exports.getScorerDashboard = async (req, res) => {
  try {
    const scorerId = req.user.id || req.user._id;

    // UTC-safe day range
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

// All matches assigned to scorer
exports.getScorerMatches = async (req, res) => {
  try {
    const scorerId = req.user.id;

    const matches = await Match.find({
      scorerId,
      isActive: true,
    })
      .sort({
        status: 1, 
        scheduledAt: 1,
      })
      .populate("teamA", "name shortName logo")
      .populate("teamB", "name shortName logo")
      .populate("tossWinner", "name shortName")
      .select(
        `
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
        `
      );

    res.json(matches);
  } catch (err) {
    console.error("Scorer matches error:", err);
    res.status(500).json({ message: "Failed to load scorer matches" });
  }
};
