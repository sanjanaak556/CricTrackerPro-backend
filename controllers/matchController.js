const Match = require("../models/Match");
const Team = require("../models/Team");
const Player = require("../models/Player");
const User = require("../models/User");
const UserRole = require("../models/UserRole");

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
      umpires
    } = req.body;

    if (teamA === teamB) {
      return res.status(400).json({ message: "A team cannot play itself" });
    }

    const team1 = await Team.findById(teamA);
    const team2 = await Team.findById(teamB);
    if (!team1 || !team2) {
      return res.status(404).json({ message: "One or both teams not found" });
    }

    const match = new Match({
      matchNumber,
      matchName,
      matchType,
      teamA,
      teamB,
      overs,
      venue,
      umpires,
      status: "upcoming",
      currentScore: { runs: 0, wickets: 0, overs: "0.0" }
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
    const matches = await Match.find({ isActive: true })
      .populate("teamA", "name shortName")
      .populate("teamB", "name shortName")
      .populate("scorerId", "name email")
      .populate("playerOfTheMatch", "name role");

    res.json(matches);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 3) Get Match by ID
exports.getMatchById = async (req, res) => {
  try {
    const match = await Match.findById(req.params.matchId)
      .populate("teamA", "name shortName")
      .populate("teamB", "name shortName")
      .populate("tossWinner", "name shortName")
      .populate("scorerId", "name email");

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

    const { matchNumber, overs, venue, umpires, status } = req.body;

    if (matchNumber !== undefined) match.matchNumber = matchNumber;
    if (overs !== undefined) match.overs = overs;
    if (umpires !== undefined) match.umpires = umpires;
    if (venue) match.venue = { ...match.venue, ...venue };

    await match.save();
    res.json({ message: "Match updated", match });

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
      return res.status(400).json({ message: "Match already started/completed" });
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
    const match = await Match.findById(req.params.matchId);
    if (!match) return res.status(404).json({ message: "Match not found" });

    match.status = "completed";
    await match.save();

    res.json({ message: "Match completed", match });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 8) Assign Scorer (admin)
exports.assignScorer = async (req, res) => {
  try {
    const { scorerId } = req.body;

    const scorer = await User.findById(scorerId);
    if (!scorer) return res.status(404).json({ message: "Scorer not found" });

    // Check role (string or ObjectId)
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

// 9) Update Live Score
exports.updateLiveScore = async (req, res) => {
  try {
    const match = await Match.findById(req.params.matchId);
    if (!match) return res.status(404).json({ message: "Match not found" });

    // Ensure only assigned scorer updates score
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

// 10) Public Live Matches
exports.getPublicLiveMatches = async (req, res) => {
  try {
    const liveMatches = await Match.find({
      status: "live",
      isActive: true
    })
      .select("matchName matchType teamA teamB currentScore status")
      .populate("teamA", "name shortName")
      .populate("teamB", "name shortName");

    res.json(liveMatches);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 11) Get Match Players
exports.getMatchPlayers = async (req, res) => {
  try {
    const match = await Match.findById(req.params.matchId)
      .populate("teamA")
      .populate("teamB");

    if (!match) return res.status(404).json({ message: "Match not found" });

    const playersA = await Player.find({ teamId: match.teamA._id });
    const playersB = await Player.find({ teamId: match.teamB._id });

    res.json({
      teamA: match.teamA.name,
      teamB: match.teamB.name,
      playersA,
      playersB
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 12) FIXED VERSION — Get Active Match for Scorer
exports.getActiveMatchForScorer = async (req, res) => {
  try {
    const scorerId = req.user.id;

    const match = await Match.findOne({
      scorerId: scorerId,
      isActive: true,
      status: { $in: ["upcoming", "live"] }
    })
      .populate("teamA", "name")
      .populate("teamB", "name");

    if (!match) {
      return res.status(404).json({ message: "No active match assigned" });
    }

    res.json({ match });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


