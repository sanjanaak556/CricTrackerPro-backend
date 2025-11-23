const Match = require("../models/Match");
const Team = require("../models/Team");
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
      return res.status(400).json({ message: "A team cannot play against itself" });
    }

    const team1 = await Team.findById(teamA);
    const team2 = await Team.findById(teamB);
    if (!team1 || !team2) {
      return res.status(404).json({ message: "One or both teams not found" });
    }

    const validTypes = ["T20", "ODI", "TEST", "OTHER"];
    if (matchType && !validTypes.includes(matchType)) {
      return res.status(400).json({ message: "Invalid match type" });
    }

    if (!venue || !venue.name) {
      return res.status(400).json({ message: "Venue name is required" });
    }

    const match = new Match({
      matchNumber,
      matchName,
      matchType,
      teamA,
      teamB,
      overs,
      venue: venue || {},
      umpires: umpires || [],
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

// 3) Get Match By ID
exports.getMatchById = async (req, res) => {
  try {
    const match = await Match.findById(req.params.matchId)
      .populate("teamA", "name shortName")
      .populate("teamB", "name shortName")
      .populate("tossWinner", "name shortName")
      .populate("scorerId", "name email")
      .populate("playerOfTheMatch", "name role");

    if (!match) return res.status(404).json({ message: "Match not found" });

    res.json(match);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 4) Update Match
exports.updateMatch = async (req, res) => {
  try {
    const match = await Match.findById(req.params.matchId);
    if (!match) return res.status(404).json({ message: "Match not found" });

    const { matchNumber, overs, venue, umpires, status } = req.body;

    if (matchNumber !== undefined) match.matchNumber = matchNumber;
    if (overs !== undefined) match.overs = overs;
    if (umpires !== undefined) match.umpires = umpires;

    const validTransitions = {
      upcoming: ["live", "abandoned", "postponed"],
      live: ["completed", "abandoned"],
      completed: []
    };

    if (status && !validTransitions[match.status].includes(status)) {
      return res.status(400).json({ message: "Invalid status transition" });
    }

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

    res.json({ message: "Match soft-deleted" });

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
      return res.status(400).json({ message: "Match already started or completed" });
    }

    if (!match.overs || match.overs <= 0) {
      return res.status(400).json({ message: "Invalid or missing overs value" });
    }

    if (
      String(tossWinner) !== String(match.teamA) &&
      String(tossWinner) !== String(match.teamB)
    ) {
      return res.status(400).json({ message: "Toss winner must be one of the two teams" });
    }

    if (electedTo && !["bat", "bowl"].includes(electedTo)) {
      return res.status(400).json({ message: "Invalid decision: must be bat or bowl" });
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

    res.json({ message: "Match marked as completed", match });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 8) Assign Scorer
exports.assignScorer = async (req, res) => {
  try {
    const { scorerId } = req.body;
    const scorer = await User.findById(scorerId);

    if (!scorer) return res.status(404).json({ message: "Scorer not found" });

    // Support both cases:(user.role stored as ObjectId or as plain string)
    let isScorer = false;

    if (!scorer.role) {
      isScorer = false;
    } else if (typeof scorer.role === "string") {
      // direct string stored in user.role
      isScorer = scorer.role.toLowerCase() === "scorer";
    } else {
      // likely an ObjectId referencing UserRole
      const roleDoc = await UserRole.findById(scorer.role);
      isScorer = roleDoc && roleDoc.roleName === "scorer";
    }

    if (!isScorer) {
      return res.status(400).json({ message: "This user is not a scorer" });
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

    // Only allow assigned scorer to update live score
    if (!match.scorerId || String(match.scorerId) !== String(req.user._id)) {
      return res.status(403).json({ message: "You are not assigned as scorer for this match" });
    }

    const { runs, wickets, overs } = req.body;

    if (runs !== undefined) match.currentScore.runs = runs;
    if (wickets !== undefined) match.currentScore.wickets = wickets;
    if (overs !== undefined) match.currentScore.overs = overs;

    await match.save();
    res.json({ message: "Live score updated", match });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 10) Public Live Matches
exports.getPublicLiveMatches = async (req, res) => {
  try {
    const matches = await Match.find({
      status: "live",
      isActive: true
    })
      .select("matchName matchType teamA teamB currentScore status")
      .populate("teamA", "name shortName")
      .populate("teamB", "name shortName");

    res.json(matches);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



