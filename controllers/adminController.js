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

    // Team win percentage chart
    const teamWinStats = await Match.aggregate([
      { $match: { isActive: true, status: "completed", winnerTeam: { $ne: null } } },
      {
        $group: {
          _id: "$winnerTeam",
          wins: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: "teams",
          localField: "_id",
          foreignField: "_id",
          as: "teamInfo"
        }
      },
      { $unwind: "$teamInfo" },
      {
        $project: {
          teamName: "$teamInfo.name",
          wins: 1
        }
      }
    ]);

    // Total matches per team
    const teamMatchStats = await Match.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          teams: {
            $push: {
              team: "$teamA",
              matches: 1
            }
          }
        }
      },
      { $unwind: "$teams" },
      {
        $group: {
          _id: "$teams.team",
          totalMatches: { $sum: "$teams.matches" }
        }
      },
      {
        $unionWith: {
          coll: "matches",
          pipeline: [
            { $match: { isActive: true } },
            {
              $group: {
                _id: null,
                teams: {
                  $push: {
                    team: "$teamB",
                    matches: 1
                  }
                }
              }
            },
            { $unwind: "$teams" },
            {
              $group: {
                _id: "$teams.team",
                totalMatches: { $sum: "$teams.matches" }
              }
            }
          ]
        }
      },
      {
        $group: {
          _id: "$_id",
          totalMatches: { $sum: "$totalMatches" }
        }
      },
      {
        $lookup: {
          from: "teams",
          localField: "_id",
          foreignField: "_id",
          as: "teamInfo"
        }
      },
      { $unwind: "$teamInfo" },
      {
        $project: {
          teamName: "$teamInfo.name",
          totalMatches: 1
        }
      }
    ]);

    // Combine wins and total matches to calculate win percentage
    const teamWinPercentage = teamMatchStats.map(team => {
      const winData = teamWinStats.find(win => win.teamName === team.teamName);
      const wins = winData ? winData.wins : 0;
      const percentage = team.totalMatches > 0 ? ((wins / team.totalMatches) * 100).toFixed(1) : 0;
      return {
        _id: team.teamName,
        wins,
        totalMatches: team.totalMatches,
        percentage: parseFloat(percentage)
      };
    }).sort((a, b) => b.percentage - a.percentage);

    // Top run-scoring teams chart
    const topRunScoring = await Match.aggregate([
      { $match: { isActive: true } },
      {
        $lookup: {
          from: "innings",
          localField: "innings",
          foreignField: "_id",
          as: "inningsData"
        }
      },
      { $unwind: "$inningsData" },
      {
        $group: {
          _id: "$inningsData.battingTeam",
          totalRuns: { $sum: "$inningsData.totalRuns" }
        }
      },
      {
        $lookup: {
          from: "teams",
          localField: "_id",
          foreignField: "_id",
          as: "teamInfo"
        }
      },
      { $unwind: "$teamInfo" },
      {
        $project: {
          teamName: "$teamInfo.name",
          totalRuns: 1
        }
      },
      { $sort: { totalRuns: -1 } },
      { $limit: 10 }
    ]);

    // Recent activities (last 5 matches and users)
    const recentUsers = await User.find({ isActive: true })
      .populate("role", "roleName")
      .sort({ createdAt: -1 })
      .limit(5);

    const activities = [
      ...recentMatchesRaw.slice(0, 5).map(match => ({
        type: "match",
        message: `Match created: ${match.teamA.name} vs ${match.teamB.name}`,
        timestamp: match.createdAt
      })),
      ...recentUsers.map(user => ({
        type: "user",
        message: `User registered: ${user.name} (${user.role.roleName})`,
        timestamp: user.createdAt
      }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 10);

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
        userRoles: userRoleStats,
        teamWinPercentage,
        topRunScoring
      },
      activities
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
