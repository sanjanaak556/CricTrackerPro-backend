const User = require("../models/User");
const Team = require("../models/Team");
const Match = require("../models/Match");

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
    const highlights = await Match.find({ status: "completed" })
      .sort({ updatedAt: -1 })
      .limit(6)
      .select("teamA teamB result winner winMargin status createdAt")
      .populate("teamA", "name shortName logo")
      .populate("teamB", "name shortName logo");

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
    const highlights = await Match.find({ status: "completed" })
      .sort({ updatedAt: -1 })
      .limit(6)
      .select("teamA teamB result winner winMargin status createdAt")
      .populate("teamA", "name shortName logo")
      .populate("teamB", "name shortName logo");

    res.json(highlights);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/// -------------------------------------------------------------
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
