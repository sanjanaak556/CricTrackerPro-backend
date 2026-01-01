const User = require("../models/User");
const Team = require("../models/Team");
const Match = require("../models/Match");
const Innings = require("../models/Innings");
const Player = require("../models/Player");

// -------------------------------------------------------------
// GET FOLLOWED TEAMS
// -------------------------------------------------------------
exports.getFollowedTeams = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate("followedTeams");

    res.json(user.followedTeams || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// -------------------------------------------------------------
// FOLLOW A TEAM
// -------------------------------------------------------------
exports.followTeam = async (req, res) => {
  try {
    const { teamId } = req.body;

    const user = await User.findById(req.user.id);

    if (!user.followedTeams.includes(teamId)) {
      user.followedTeams.push(teamId);
      await user.save();
    }

    res.json({ message: "Team followed successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// -------------------------------------------------------------
// UNFOLLOW A TEAM
// -------------------------------------------------------------
exports.unfollowTeam = async (req, res) => {
  try {
    const { teamId } = req.body;

    await User.findByIdAndUpdate(req.user.id, {
      $pull: { followedTeams: teamId },
    });

    res.json({ message: "Team unfollowed successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// -------------------------------------------------------------
// VIEWER DASHBOARD ( Highlights)
// -------------------------------------------------------------
exports.getViewerDashboard = async (req, res) => {
  try {
    const totalTeams = await Team.countDocuments({ isActive: true });
    const totalMatches = await Match.countDocuments();

    // Highlights (last 6 completed matches)
    const highlightsRaw = await Match.find({ status: "completed" })
      .sort({ updatedAt: -1 })
      .limit(6)
      .populate("teamA", "name shortName logo")
      .populate("teamB", "name shortName logo")
      .populate("winnerTeam", "name shortName logo");

    // Add result field to each highlight
    const highlights = highlightsRaw.map(match => {
      let result = "Result not available";
      if (match.status === "completed" && match.winnerTeam) {
        result = match.winType && match.winMargin
          ? `${match.winnerTeam.name} won by ${match.winMargin} ${match.winType}`
          : `${match.winnerTeam.name} won`;
      }
      return { ...match.toObject(), result };
    });

    res.json({
      totalTeams,
      totalMatches,
      highlights,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// -------------------------------------------------------------
// DASHBOARD STATS
// -------------------------------------------------------------
exports.getViewerDashboardStats = async (req, res) => {
  try {
    console.log("📊 Dashboard stats API hit");

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    console.log("📅 Today range:", todayStart, todayEnd);

    // ✅ Today's Matches = (scheduled today) OR (currently live)
    const todaysMatches = await Match.countDocuments({
      $or: [
        {
          scheduledAt: { $gte: todayStart, $lte: todayEnd },
        },
        {
          status: "live",
        },
      ],
    });

    console.log("✅ Today's matches (incl live):", todaysMatches);

    // 🔴 Live Matches (only live)
    const liveMatches = await Match.countDocuments({
      status: "live",
    });

    console.log("🔴 Live matches:", liveMatches);

    // ⭐ Followed Teams Count
    const user = await User.findById(req.user.id).select("followedTeams");
    const followedTeamsCount = user?.followedTeams?.length || 0;

    console.log("⭐ Followed teams:", followedTeamsCount);

    res.json({
      todaysMatches,
      liveMatches,
      followedTeams: followedTeamsCount,
    });
  } catch (err) {
    console.error("❌ Dashboard stats error:", err);
    res.status(500).json({ message: "Failed to load dashboard stats" });
  }
};

// -------------------------------------------------------------
// VIEWER HIGHLIGHTS PAGE (Stand-alone Highlights List)
// -------------------------------------------------------------
exports.getMatchHighlights = async (req, res) => {
  try {
    const highlightsRaw = await Match.find({ status: "completed" })
      .sort({ updatedAt: -1 })
      .limit(6)
      .populate("teamA", "name shortName logo")
      .populate("teamB", "name shortName logo")
      .populate("winnerTeam", "name shortName logo");

    // Add result field to each highlight
    const highlights = highlightsRaw.map(match => {
      let result = "Result not available";
      if (match.status === "completed" && match.winnerTeam) {
        result = match.winType && match.winMargin
          ? `${match.winnerTeam.name} won by ${match.winMargin} ${match.winType}`
          : `${match.winnerTeam.name} won`;
      }
      return { ...match.toObject(), result };
    });

    res.json(highlights);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// -------------------------------------------------------------
// GET FOLLOWED TEAMS ACTIVITY (LIVE + UPCOMING + RECENT)
// -------------------------------------------------------------
exports.getFollowedTeamsActivity = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Get followed teams
    const user = await User.findById(userId).select("followedTeams");
    const teamIds = user.followedTeams || [];

    // -------------------------------
    // 2. LIVE MATCHES (Top priority)
    // -------------------------------
    const liveMatches = await Match.find({
      $or: [{ teamA: { $in: teamIds } }, { teamB: { $in: teamIds } }],
      status: "live",
    })
      .populate("teamA teamB", "name logo")
      .sort({ updatedAt: -1 });

    // -------------------------------
    // 3. UPCOMING MATCHES
    // -------------------------------
    const upcomingMatches = await Match.find({
      $or: [{ teamA: { $in: teamIds } }, { teamB: { $in: teamIds } }],
      status: "upcoming",
      scheduledAt: { $exists: true },
    })
      .populate("teamA teamB", "name logo")
      .sort({ scheduledAt: 1 })
      .limit(10);

    // -------------------------------
    // 4. RECENT MATCHES
    // -------------------------------
    const recentMatches = await Match.find({
      $or: [{ teamA: { $in: teamIds } }, { teamB: { $in: teamIds } }],
      status: "completed",
    })
      .populate("teamA teamB", "name logo")
      .sort({ updatedAt: -1 })
      .limit(10);

    res.json({
      liveMatches,
      upcomingMatches,
      recentMatches,
    });
  } catch (error) {
    console.log("Followed teams activity error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// -------------------------------------------------------------
// GET TEAM RANKINGS
// -------------------------------------------------------------
exports.getTeamRankings = async (req, res) => {
  try {
    // Get all completed matches
    const completedMatches = await Match.find({ status: "completed" })
      .populate("teamA", "name")
      .populate("teamB", "name")
      .populate("winnerTeam", "name");

    // Calculate team stats
    const teamStats = {};

    // Initialize teams
    const allTeams = new Set();
    completedMatches.forEach(match => {
      allTeams.add(match.teamA._id.toString());
      allTeams.add(match.teamB._id.toString());
    });

    // Initialize team stats
    for (const teamId of allTeams) {
      const team = completedMatches.find(m =>
        m.teamA._id.toString() === teamId || m.teamB._id.toString() === teamId
      );
      const teamName = team.teamA._id.toString() === teamId ? team.teamA.name : team.teamB.name;
      teamStats[teamId] = {
        id: teamId,
        name: teamName,
        matches: 0,
        wins: 0,
        points: 0
      };
    }

    // Count matches and wins
    completedMatches.forEach(match => {
      // Count matches for both teams
      teamStats[match.teamA._id.toString()].matches++;
      teamStats[match.teamB._id.toString()].matches++;

      // Count wins
      if (match.winnerTeam) {
        teamStats[match.winnerTeam._id.toString()].wins++;
      }
    });

    // Calculate points (2 points per win)
    Object.values(teamStats).forEach(team => {
      team.points = team.wins * 2;
    });

    // Sort by points descending, then by wins descending
    const rankings = Object.values(teamStats)
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        return b.wins - a.wins;
      })
      .map((team, index) => ({
        rank: index + 1,
        name: team.name,
        matches: team.matches,
        wins: team.wins,
        points: team.points
      }));

    res.json(rankings);
  } catch (err) {
    console.error("Team rankings error:", err);
    res.status(500).json({ error: err.message });
  }
};

// -------------------------------------------------------------
// GET BATTER RANKINGS
// -------------------------------------------------------------
exports.getBatterRankings = async (req, res) => {
  try {
    const batters = await Player.find({ isActive: true })
      .populate("teamId", "name")
      .sort({ runs: -1, average: -1 })
      .limit(50);

    const rankings = batters.map((player, index) => ({
      rank: index + 1,
      name: player.name,
      team: player.teamId.name,
      runs: player.runs,
      avg: player.average
    }));

    res.json(rankings);
  } catch (err) {
    console.error("Batter rankings error:", err);
    res.status(500).json({ error: err.message });
  }
};

// -------------------------------------------------------------
// GET BOWLER RANKINGS
// -------------------------------------------------------------
exports.getBowlerRankings = async (req, res) => {
  try {
    const bowlers = await Player.find({ isActive: true })
      .populate("teamId", "name")
      .sort({ wickets: -1, economy: 1 }) // Lower economy is better
      .limit(50);

    const rankings = bowlers.map((player, index) => ({
      rank: index + 1,
      name: player.name,
      team: player.teamId.name,
      wickets: player.wickets,
      eco: player.economy
    }));

    res.json(rankings);
  } catch (err) {
    console.error("Bowler rankings error:", err);
    res.status(500).json({ error: err.message });
  }
};
