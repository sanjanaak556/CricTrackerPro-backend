const Match = require("../models/Match");
const Team = require("../models/Team");
const Player = require("../models/Player");
const User = require("../models/User");
const UserRole = require("../models/UserRole");
const Innings = require("../models/Innings");
const { generateMatchSummary } = require("./matchSummaryController");

// 1) Create Match
exports.createMatch = async (req, res) => {
  try {
    const {
      matchNumber,
      matchName,
      matchType,
      teamA,
      teamB,
      overs,
      venue,
      umpires,
      scorerId,
    } = req.body;

    if (teamA === teamB) {
      return res.status(400).json({ message: "A team cannot play itself" });
    }

    const team1 = await Team.findById(teamA);
    const team2 = await Team.findById(teamB);
    if (!team1 || !team2) {
      return res.status(404).json({ message: "One or both teams not found" });
    }

    //  Proper scheduledAt for today (UTC-safe)
    const scheduledAt = new Date();
    scheduledAt.setUTCHours(0, 0, 0, 0);

    const match = new Match({
      matchNumber,
      matchName,
      matchType,
      teamA,
      teamB,
      overs,
      venue,
      scheduledAt,
      umpires,
      scorerId,
      status: "upcoming",
      currentScore: { runs: 0, wickets: 0, overs: "0.0" },
    });

    await match.save();
    res.status(201).json({ message: "Match created successfully", match });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 2) Get All Matches
exports.getAllMatches = async (req, res) => {
  try {
    console.log("📥 Get All Matches API hit");

    const { status } = req.query;
    let filter = { isActive: true };

    if (status && status.toLowerCase() !== "all") {
      filter.status = status.toLowerCase();
    }

    console.log("🔎 Match filter:", filter);

    const matches = await Match.find(filter)
      .sort({ scheduledAt: 1, createdAt: -1 })
      .populate("teamA", "name shortName logo")
      .populate("teamB", "name shortName logo")
      .populate("tossWinner", "name shortName logo") // ADDED THIS LINE
      .populate("scorerId", "name email")
      .populate("playerOfTheMatch", "name role")
      .populate("winnerTeam", "name shortName logo");

    console.log("✅ Matches found:", matches.length);

    res.json(matches);
  } catch (err) {
    console.error("❌ Get matches error:", err);
    res.status(500).json({ error: err.message });
  }
};

// 3) Get Match by ID
exports.getMatchById = async (req, res) => {
  try {
    const match = await Match.findById(req.params.matchId)
      .populate("teamA", "name shortName logo")
      .populate("teamB", "name shortName logo")
      .populate("tossWinner", "name shortName logo")
      .populate("scorerId", "name email")
      .populate({
        path: "currentInnings",
        populate: [
          { path: "striker", select: "name" },
          { path: "nonStriker", select: "name" },
          { path: "currentBowler", select: "name" }
        ]
      });

    if (!match) {
      return res.status(404).json({ message: "Match not found" });
    }

    res.json(match);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 4) Update Match
exports.updateMatch = async (req, res) => {
  try {
    const match = await Match.findById(req.params.matchId);
    if (!match) {
      return res.status(404).json({ message: "Match not found" });
    }

    const { matchNumber, overs, venue, umpires, tossWinner, electedTo, status } = req.body;

    if (matchNumber !== undefined) match.matchNumber = matchNumber;
    if (overs !== undefined) match.overs = overs;
    if (umpires !== undefined) match.umpires = umpires;
    if (venue) match.venue = { ...match.venue, ...venue };
    
    // Add these lines to handle toss and status updates
    if (tossWinner !== undefined) match.tossWinner = tossWinner;
    if (electedTo !== undefined) match.electedTo = electedTo;
    if (status !== undefined) match.status = status;

    await match.save();
    
    // Populate the tossWinner field before returning
    const updatedMatch = await Match.findById(req.params.matchId)
      .populate("teamA", "name shortName logo")
      .populate("teamB", "name shortName logo")
      .populate("tossWinner", "name shortName logo")
      .populate("scorerId", "name email");

    res.json({ message: "Match updated", match: updatedMatch });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 5) Soft Delete Match
exports.deleteMatch = async (req, res) => {
  try {
    const match = await Match.findById(req.params.matchId);
    if (!match) return res.status(404).json({ message: "Match not found" });

    match.isActive = false;
    await match.save();

    res.json({ message: "Match deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 6) Start Match
exports.startMatch = async (req, res) => {
  try {
    const { tossWinner, electedTo } = req.body;

    const match = await Match.findById(req.params.matchId);
    if (!match) return res.status(404).json({ message: "Match not found" });

    if (match.status !== "upcoming") {
      return res
        .status(400)
        .json({ message: "Match already started/completed" });
    }

    match.tossWinner = tossWinner;
    match.electedTo = electedTo;
    match.status = "live";

    await match.save();
    res.json({ message: "Match started", match });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 7) Complete Match
exports.completeMatch = async (req, res) => {
  try {
    const match = await Match.findById(req.params.matchId).populate('innings');
    if (!match) return res.status(404).json({ message: "Match not found" });

    // Calculate winner based on innings
    const innings = match.innings;
    if (innings.length === 2) {
      const firstInnings = innings.find(i => i.inningsNumber === 1);
      const secondInnings = innings.find(i => i.inningsNumber === 2);

      if (firstInnings && secondInnings) {
        const teamARuns = firstInnings.battingTeam.toString() === match.teamA.toString() ? firstInnings.totalRuns : secondInnings.totalRuns;
        const teamBRuns = firstInnings.battingTeam.toString() === match.teamB.toString() ? firstInnings.totalRuns : secondInnings.totalRuns;

        if (teamARuns > teamBRuns) {
          match.winnerTeam = match.teamA;
          match.winType = "runs";
          match.winMargin = teamARuns - teamBRuns;
        } else if (teamBRuns > teamARuns) {
          match.winnerTeam = match.teamB;
          match.winType = "runs";
          match.winMargin = teamBRuns - teamARuns;
        } else {
          // Tie - for simplicity, no winner
          match.winnerTeam = null;
          match.winType = null;
          match.winMargin = null;
        }
      }
    } else if (innings.length === 1) {
      // If only one innings, the batting team wins if they reached target, but typically not applicable
      // For now, assume no winner
    }

    match.status = "completed";
    await match.save();

    // Populate winnerTeam for response
    const updatedMatch = await Match.findById(req.params.matchId)
      .populate("winnerTeam", "name shortName logo");

    // Auto-generate summary for completed match
    try {
      await generateMatchSummary(req.params.matchId);
    } catch (summaryErr) {
      console.error("Auto-generate summary failed:", summaryErr.message);
      // Don't fail the match completion if summary generation fails
    }

    res.json({ message: "Match completed", match: updatedMatch });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 8) Abandon Match
exports.abandonMatch = async (req, res) => {
  try {
    const { statusReason } = req.body;

    const match = await Match.findById(req.params.matchId);
    if (!match) return res.status(404).json({ message: "Match not found" });

    match.status = "abandoned";
    match.statusReason = statusReason;
    match.abandonedAt = new Date();

    await match.save();
    res.json({ message: "Match abandoned", match });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 9) Assign Scorer
exports.assignScorer = async (req, res) => {
  try {
    const { scorerId } = req.body;

    const scorer = await User.findById(scorerId);
    if (!scorer) return res.status(404).json({ message: "Scorer not found" });

    let isScorer = false;

    if (typeof scorer.role === "string") {
      isScorer = scorer.role.toLowerCase() === "scorer";
    } else {
      const roleDoc = await UserRole.findById(scorer.role);
      if (roleDoc && roleDoc.roleName === "scorer") isScorer = true;
    }

    if (!isScorer) {
      return res.status(400).json({ message: "User is not a scorer" });
    }

    const match = await Match.findById(req.params.matchId);
    if (!match) return res.status(404).json({ message: "Match not found" });

    match.scorerId = scorerId;
    await match.save();

    res.json({ message: "Scorer assigned", match });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 10) Update Live Score
exports.updateLiveScore = async (req, res) => {
  try {
    const match = await Match.findById(req.params.matchId);
    if (!match) return res.status(404).json({ message: "Match not found" });

    if (String(match.scorerId) !== String(req.user._id)) {
      return res.status(403).json({ message: "Not assigned as scorer" });
    }

    const { runs, wickets, overs } = req.body;

    if (runs !== undefined) match.currentScore.runs = runs;
    if (wickets !== undefined) match.currentScore.wickets = wickets;
    if (overs !== undefined) match.currentScore.overs = overs;

    await match.save();
    res.json({ message: "Score updated", match });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 11) Public Live Matches
exports.getPublicLiveMatches = async (req, res) => {
  try {
    const liveMatches = await Match.find({
      status: "live",
      isActive: true,
    })
      .select("matchName matchType teamA teamB currentScore status")
      .populate("teamA", "name shortName logo")
      .populate("teamB", "name shortName logo");

    res.json(liveMatches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 12) Get live matches for logged-in users
exports.getLoggedInLiveMatches = async (req, res) => {
  try {
    const liveMatches = await Match.find({
      status: "live",
      isActive: true,
    })
      .select(
        "matchName matchType teamA teamB tossWinner scorerId currentScore overs status venue umpires"
      )
      .populate("teamA", "name shortName logo")
      .populate("teamB", "name shortName logo")
      .populate("tossWinner", "name shortName logo")
      .populate("scorerId", "name email")
      .populate("venue", "name city country")
      .populate("umpires", "name role")
      .lean();

    res.json(liveMatches);
  } catch (err) {
    console.error("Live matches error:", err);
    res.status(500).json({ message: "Failed to load live matches" });
  }
};

// 13) Get Match Players
exports.getMatchPlayers = async (req, res) => {
  try {
    const match = await Match.findById(req.params.matchId)
      .populate("teamA")
      .populate("teamB");

    if (!match) return res.status(404).json({ message: "Match not found" });

    const playersA = await Player.find({ teamId: match.teamA._id }).sort({
      isCaptain: -1,
      name: 1,
    });

    const playersB = await Player.find({ teamId: match.teamB._id }).sort({
      isCaptain: -1,
      name: 1,
    });

    res.json({
      teamA: {
        name: match.teamA.name,
        logo: match.teamA.logo,
        players: playersA,
      },
      teamB: {
        name: match.teamB.name,
        logo: match.teamB.logo,
        players: playersB,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 14) Active Match For Scorer
exports.getActiveMatchForScorer = async (req, res) => {
  try {
    const scorerId = req.user.id;

    const match = await Match.findOne({
      scorerId: scorerId,
      isActive: true,
      status: { $in: ["upcoming", "live"] },
    })
      .populate("teamA", "name logo")
      .populate("teamB", "name logo");

    if (!match) {
      return res.status(404).json({ message: "No active match assigned" });
    }

    res.json({ match });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 15) End Innings
exports.endInnings = async (req, res) => {
  try {
    const { reason } = req.body;
    const matchId = req.params.matchId;

    const match = await Match.findById(matchId);
    if (!match) return res.status(404).json({ message: "Match not found" });

    const innings = await Innings.findOne({ matchId, isActive: true, completed: false });
    if (!innings) {
      return res.status(400).json({ message: "No active innings to end" });
    }

    // Mark innings as completed
    innings.completed = true;
    innings.endReason = reason || "Manual end";
    await innings.save();

    // Set target for second innings if this is the first innings
    if (innings.inningsNumber === 1) {
      match.target = innings.totalRuns + 1;
      await match.save();
    }

    // Emit socket event for innings completion
    const { getIO } = require("../services/socket");
    const io = getIO();
    if (io) {
      io.to(`match_${match._id}`).emit("inningsComplete", {
        runs: innings.totalRuns,
        wickets: innings.totalWickets,
        inningsNumber: innings.inningsNumber,
        reason: reason || "Manual end"
      });
    }

    res.json({
      message: "Innings ended successfully",
      innings,
      target: match.target
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
