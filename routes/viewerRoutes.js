const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");

const {
  getFollowedTeams,
  followTeam,
  unfollowTeam,
  getViewerDashboard,
  getMatchHighlights,
  getFollowedTeamsActivity,
  getViewerDashboardStats,
  getTeamRankings,
  getBatterRankings,
  getBowlerRankings
} = require("../controllers/viewerController");

// Viewer Dashboard
router.get("/dashboard", auth, getViewerDashboard);

// Follow / Unfollow Teams
router.get("/followed", auth, getFollowedTeams);
router.post("/follow", auth, followTeam);
router.post("/unfollow", auth, unfollowTeam);

// Match Highlights
router.get("/highlights", auth, getMatchHighlights);

// Dashboard Stats
router.get("/dashboard/stats", auth, getViewerDashboardStats);

// Followed teams activity (upcoming + recent)
router.get("/followed/activity", auth, getFollowedTeamsActivity);

// Leaderboard
router.get("/leaderboard/teams", auth, getTeamRankings);
router.get("/leaderboard/batters", auth, getBatterRankings);
router.get("/leaderboard/bowlers", auth, getBowlerRankings);

module.exports = router;
