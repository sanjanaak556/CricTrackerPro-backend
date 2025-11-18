const Team = require("../models/Team");

// CREATE TEAM (Admin only)
exports.createTeam = async (req, res) => {
  try {
    const { name, logo } = req.body;

    if (!name) return res.status(400).json({ message: "Team name is required" });

    const exists = await Team.findOne({ name, isActive: true });
    if (exists) return res.status(400).json({ message: "Active team with this name already exists" });

    const team = new Team({ name, logo });
    await team.save();

    res.status(201).json({ message: "Team created successfully", team });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET ALL ACTIVE TEAMS
exports.getTeams = async (req, res) => {
  try {
    const teams = await Team.find({ isActive: true }).sort({ name: 1 });
    res.json(teams);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// UPDATE TEAM (Admin only)
exports.updateTeam = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { name, logo } = req.body;

    const team = await Team.findById(teamId);
    if (!team || !team.isActive)
      return res.status(404).json({ message: "Team not found" });

    // If updating name → check for duplicates
    if (name && name !== team.name) {
      const exists = await Team.findOne({ name, isActive: true });
      if (exists) return res.status(400).json({ message: "Another active team already has this name" });
      team.name = name;
    }

    if (logo) team.logo = logo;

    await team.save();
    res.json({ message: "Team updated successfully", team });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// SOFT DELETE TEAM (Admin only)
exports.deleteTeam = async (req, res) => {
  try {
    const { teamId } = req.params;

    const team = await Team.findById(teamId);
    if (!team || !team.isActive)
      return res.status(404).json({ message: "Team not found" });

    team.isActive = false;
    await team.save();

    res.json({ message: "Team soft-deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



