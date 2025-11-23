const Team = require("../models/Team");
const uploadToCloudinary = require("../utils/uploadToCloudinary");

// CREATE TEAM (Admin only)
exports.createTeam = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) return res.status(400).json({ message: "Team name is required" });

    const exists = await Team.findOne({ name, isActive: true });
    if (exists) return res.status(400).json({ message: "Active team with this name already exists" });

    // Check image
    if (!req.file)
      return res.status(400).json({ message: "Team logo is required" });

    // Upload to cloudinary
    const result = await uploadToCloudinary(
      req.file.buffer,
      "cric_app_team_logos"
    );

    const team = new Team({ name, logo: result.secure_url });
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
    const { name } = req.body;

    const team = await Team.findById(teamId);
    if (!team || !team.isActive)
      return res.status(404).json({ message: "Team not found" });

    // If updating name → check for duplicates
    if (name && name !== team.name) {
      const exists = await Team.findOne({ name, isActive: true });
      if (exists) return res.status(400).json({ message: "Another active team already has this name" });
      team.name = name;
    }

    // If new logo uploaded
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



