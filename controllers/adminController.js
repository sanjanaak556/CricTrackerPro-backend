const Team = require("../models/Team");
const Player = require("../models/Player");
const Match = require("../models/Match");
const User = require("../models/User");
const UserRole = require("../models/UserRole");

// ================= DASHBOARD STATS =================
exports.getDashboardStats = async (req, res) => {
  try {
    // Basic counts
    const totalTeams = await Team.countDocuments({ isActive: true });
    const totalPlayers = await Player.countDocuments({ isActive: true });
    const totalMatches = await Match.countDocuments({ isActive: true });

    // Active scorers
    const scorerRole = await UserRole.findOne({ roleName: "scorer" });
    const activeScorers = scorerRole
      ? await User.countDocuments({
          role: scorerRole._id,
          isActive: true
        })
      : 0;

    // Recent matches (last 5)
    const recentMatchesRaw = await Match.find({ isActive: true })
      .populate("teamA", "name")
      .populate("teamB", "name")
      .populate("winnerTeam", "name")
      .populate("scorerId", "name")
      .sort({ createdAt: -1 })
      .limit(5);

    const recentMatches = recentMatchesRaw.map(match => {
      let result = "N/A";

      if (match.status === "completed" && match.winnerTeam) {
        result = match.winType && match.winMargin
          ? `${match.winnerTeam.name} won by ${match.winMargin} ${match.winType}`
          : `${match.winnerTeam.name} won`;
      }

      return {
        ...match.toObject(),
        result
      };
    });

    // Match status chart
    const matchStatusStats = await Match.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);

    // Match type chart
    const matchTypeStats = await Match.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: "$matchType", count: { $sum: 1 } } }
    ]);

    // User role chart
    const userRoleStats = await User.aggregate([
      { $match: { isActive: true } },
      {
        $lookup: {
          from: "userroles",
          localField: "role",
          foreignField: "_id",
          as: "roleInfo"
        }
      },
      { $unwind: "$roleInfo" },
      { $group: { _id: "$roleInfo.roleName", count: { $sum: 1 } } }
    ]);

    res.json({
      stats: {
        totalTeams,
        totalPlayers,
        totalMatches,
        activeScorers
      },
      recentMatches,
      charts: {
        matchStatus: matchStatusStats,
        matchType: matchTypeStats,
        userRoles: userRoleStats
      }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ================= MATCH REPORT =================
exports.getMatchReport = async (req, res) => {
  try {
    const match = await Match.findById(req.params.id)
      .populate("teamA", "name")
      .populate("teamB", "name")
      .populate("winnerTeam", "name")
      .populate("playerOfTheMatch", "name")
      .populate("innings");

    if (!match) {
      return res.status(404).json({ message: "Match not found" });
    }

    let result = "N/A";

    if (match.status === "completed" && match.winnerTeam) {
      result = match.winType && match.winMargin
        ? `${match.winnerTeam.name} won by ${match.winMargin} ${match.winType}`
        : `${match.winnerTeam.name} won`;
    }

    res.json({
      match: {
        ...match.toObject(),
        result
      }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
