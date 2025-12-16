const Team = require("../models/Team");
const Player = require("../models/Player");
const Match = require("../models/Match");
const User = require("../models/User");
const UserRole = require("../models/UserRole");
const uploadToCloudinary = require("../utils/uploadToCloudinary");

// Get dashboard statistics
exports.getDashboardStats = async (req, res) => {
  try {
    // Get counts
    const totalTeams = await Team.countDocuments({ isActive: true });
    const totalPlayers = await Player.countDocuments({ isActive: true });
    const totalMatches = await Match.countDocuments({ isActive: true });

    // Get active scorers count
    const scorerRole = await UserRole.findOne({ roleName: "scorer" });
    const activeScorers = await User.countDocuments({
      role: scorerRole?._id,
      isActive: true
    });

    // Get recent matches (last 5)
    const recentMatchesRaw = await Match.find({ isActive: true })
      .populate("teamA", "name")
      .populate("teamB", "name")
      .populate("winnerTeam", "name")
      .populate("scorerId", "name")
      .sort({ createdAt: -1 })
      .limit(5)
      .select("matchName matchType status teamA teamB winnerTeam winType winMargin scorerId createdAt");

    // Add computed result field
    const recentMatches = recentMatchesRaw.map(match => {
      let result = 'N/A';
      if (match.status === 'completed' && match.winnerTeam) {
        const winnerName = match.winnerTeam.name;
        if (match.winType && match.winMargin) {
          result = `${winnerName} won by ${match.winMargin} ${match.winType}`;
        } else {
          result = `${winnerName} won`;
        }
      } else if (match.status === 'completed') {
        result = 'Match completed';
      }
      return {
        ...match.toObject(),
        result
      };
    });

    // Get match status distribution for pie chart
    const matchStatusStats = await Match.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);

    // Get matches by type for bar chart
    const matchTypeStats = await Match.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: "$matchType", count: { $sum: 1 } } }
    ]);

    // Get user role distribution
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

    // Get recent user registrations (last 10)
    const recentUsers = await User.find({ isActive: true })
      .populate("role", "roleName")
      .sort({ createdAt: -1 })
      .limit(10)
      .select("name email role createdAt");

    // Get monthly match creation stats (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyMatchStats = await Match.aggregate([
      {
        $match: {
          isActive: true,
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    // Get team win percentages
    const teamWins = await Match.aggregate([
      { $match: { isActive: true, status: "completed", winnerTeam: { $ne: null } } },
      {
        $group: {
          _id: "$winnerTeam",
          wins: { $sum: 1 }
        }
      }
    ]);

    const totalCompletedMatches = await Match.countDocuments({ isActive: true, status: "completed" });

    const teamWinPercentages = await Promise.all(
      teamWins.map(async (teamWin) => {
        const team = await Team.findById(teamWin._id).select("name");
        return {
          name: team.name,
          wins: teamWin.wins,
          percentage: Math.round((teamWin.wins / totalCompletedMatches) * 100)
        };
      })
    );

    // Get top run scoring teams
    const topRunScoringTeams = await Match.aggregate([
      { $match: { isActive: true, status: "completed" } },
      { $unwind: "$innings" },
      {
        $lookup: {
          from: "innings",
          localField: "innings",
          foreignField: "_id",
          as: "inningDetails"
        }
      },
      { $unwind: "$inningDetails" },
      {
        $group: {
          _id: "$inningDetails.battingTeam",
          totalRuns: { $sum: "$inningDetails.totalRuns" }
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
          name: "$teamInfo.name",
          totalRuns: 1
        }
      },
      { $sort: { totalRuns: -1 } },
      { $limit: 5 }
    ]);

    // Get top performing teams (most matches played)
    const teamPerformance = await Match.aggregate([
      { $match: { isActive: true, status: "completed" } },
      {
        $group: {
          _id: null,
          teamA: { $addToSet: "$teamA" },
          teamB: { $addToSet: "$teamB" }
        }
      },
      {
        $project: {
          teams: { $setUnion: ["$teamA", "$teamB"] }
        }
      },
      { $unwind: "$teams" },
      {
        $lookup: {
          from: "teams",
          localField: "teams",
          foreignField: "_id",
          as: "teamInfo"
        }
      },
      { $unwind: "$teamInfo" },
      {
        $group: {
          _id: "$teamInfo._id",
          name: { $first: "$teamInfo.name" },
          matchesPlayed: {
            $sum: {
              $add: [
                { $size: { $filter: { input: "$teamA", cond: { $eq: ["$$this", "$_id"] } } } },
                { $size: { $filter: { input: "$teamB", cond: { $eq: ["$$this", "$_id"] } } } }
              ]
            }
          }
        }
      },
      { $sort: { matchesPlayed: -1 } },
      { $limit: 5 }
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
        userRoles: userRoleStats,
        monthlyMatches: monthlyMatchStats,
        topTeams: teamPerformance,
        teamWinPercentages,
        topRunScoringTeams
      },
      recentUsers
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get match report
exports.getMatchReport = async (req, res) => {
  try {
    const { id } = req.params;

    const match = await Match.findById(id)
      .populate("teamA", "name")
      .populate("teamB", "name")
      .populate("winnerTeam", "name")
      .populate("playerOfTheMatch", "name")
      .populate("innings");

    if (!match) {
      return res.status(404).json({ error: "Match not found" });
    }

    // Calculate result
    let result = 'N/A';
    if (match.status === 'completed' && match.winnerTeam) {
      const winnerName = match.winnerTeam.name;
      if (match.winType && match.winMargin) {
        result = `${winnerName} won by ${match.winMargin} ${match.winType}`;
      } else {
        result = `${winnerName} won`;
      }
    } else if (match.status === 'completed') {
      result = 'Match completed';
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

// Team management functions
exports.getTeams = async (req, res) => {
  try {
    const teams = await Team.find({ isActive: true }).sort({ name: 1 });
    res.json({ teams });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createTeam = async (req, res) => {
  try {
    const { name, playerCount, matchesPlayed } = req.body;

    if (!name) return res.status(400).json({ message: "Team name is required" });

    const exists = await Team.findOne({ name, isActive: true });
    if (exists) return res.status(400).json({ message: "Active team with this name already exists" });

    let logoUrl = null;
    if (req.file) {
      const result = await uploadToCloudinary(
        req.file.buffer,
        "cric_app_team_logos"
      );
      logoUrl = result.secure_url;
    }

    const team = new Team({ name, playerCount, matchesPlayed, logo: logoUrl });
    await team.save();

    res.status(201).json({ message: "Team created successfully", team });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateTeam = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, playerCount, matchesPlayed } = req.body;

    const team = await Team.findById(id);
    if (!team || !team.isActive)
      return res.status(404).json({ message: "Team not found" });

    if (name && name !== team.name) {
      const exists = await Team.findOne({ name, isActive: true });
      if (exists) return res.status(400).json({ message: "Another active team already has this name" });
      team.name = name;
    }

    if (playerCount !== undefined) team.playerCount = playerCount;
    if (matchesPlayed !== undefined) team.matchesPlayed = matchesPlayed;

    if (req.file) {
      const result = await uploadToCloudinary(
        req.file.buffer,
        "cric_app_team_logos"
      );
      team.logo = result.secure_url;
    }

    await team.save();

    res.json({ message: "Team updated successfully", team });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteTeam = async (req, res) => {
  try {
    const { id } = req.params;

    const team = await Team.findById(id);
    if (!team || !team.isActive)
      return res.status(404).json({ message: "Team not found" });

    team.isActive = false;
    await team.save();

    res.json({ message: "Team soft-deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Player management functions
exports.getPlayers = async (req, res) => {
  try {
    const players = await Player.find({ isActive: true })
      .populate('teamId', 'name')
      .sort({ name: 1 });
    res.json({ players });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createPlayer = async (req, res) => {
  try {
    const { name, role, teamId, matchesPlayed, runs, wickets, average } = req.body;

    if (!name || !role || !teamId) return res.status(400).json({ message: "Name, role, and team are required" });

    const team = await Team.findById(teamId);
    if (!team || !team.isActive) return res.status(400).json({ message: "Invalid team" });

    let imageUrl = null;
    if (req.file) {
      const result = await uploadToCloudinary(
        req.file.buffer,
        "cric_app_players"
      );
      imageUrl = result.secure_url;
    }

    const player = new Player({
      name,
      role,
      teamId,
      image: imageUrl,
      matchesPlayed: matchesPlayed || 0,
      runs: runs || 0,
      wickets: wickets || 0,
      average: average || 0
    });
    await player.save();

    res.status(201).json({ message: "Player created successfully", player });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updatePlayer = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, teamId, matchesPlayed, runs, wickets, average } = req.body;

    const player = await Player.findById(id);
    if (!player || !player.isActive)
      return res.status(404).json({ message: "Player not found" });

    if (name) player.name = name;
    if (role) {
      const validRoles = ["Batter", "Bowler", "All-Rounder", "Wicket-Keeper"];
      if (!validRoles.includes(role)) return res.status(400).json({ message: "Invalid role" });
      player.role = role;
    }
    if (teamId) {
      const team = await Team.findById(teamId);
      if (!team || !team.isActive) return res.status(400).json({ message: "Invalid team" });
      player.teamId = teamId;
    }
    if (matchesPlayed !== undefined) player.matchesPlayed = matchesPlayed;
    if (runs !== undefined) player.runs = runs;
    if (wickets !== undefined) player.wickets = wickets;
    if (average !== undefined) player.average = average;

    if (req.file) {
      const result = await uploadToCloudinary(
        req.file.buffer,
        "cric_app_players"
      );
      player.image = result.secure_url;
    }

    await player.save();

    res.json({ message: "Player updated successfully", player });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deletePlayer = async (req, res) => {
  try {
    const { id } = req.params;

    const player = await Player.findById(id);
    if (!player || !player.isActive)
      return res.status(404).json({ message: "Player not found" });

    player.isActive = false;
    await player.save();

    res.json({ message: "Player soft-deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
