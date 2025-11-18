const Match = require("../models/Match");
const User = require("../models/User");

// Create a new match (Admin only)
exports.createMatch = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate("role");

    if (user.role.roleName !== "admin") {
      return res.status(403).json({ error: "Only admin can create matches" });
    }

    const match = new Match(req.body); // ObjectId auto-conversion
    await match.save();

    res.status(201).json({
      message: "Match created successfully",
      match,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all active matches (Viewer allowed)
exports.getMatches = async (req, res) => {
  try {
    const matches = await Match.find({ isActive: true })
      .populate("teamA teamB tossWinner")
      .sort({ createdAt: -1 });

    res.json(matches);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Soft delete match (Admin only)
exports.deleteMatch = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate("role");

    if (user.role.roleName !== "admin") {
      return res.status(403).json({ error: "Only admin can delete matches" });
    }

    const match = await Match.findById(req.params.matchId);

    if (!match) {
      return res.status(404).json({ error: "Match not found" });
    }

    match.isActive = false;
    await match.save();

    res.status(200).json({ message: "Match soft-deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

