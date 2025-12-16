const Team = require("../models/Team");
const Player = require("../models/Player");
const uploadToCloudinary = require("../utils/uploadToCloudinary");

// CREATE TEAM (Admin only)
exports.createTeam = async (req, res) => {
  try {
    const { name, captainId } = req.body;

    if (!name) return res.status(400).json({ message: "Team name is required" });

    const exists = await Team.findOne({ name, isActive: true });
    if (exists) return res.status(400).json({ message: "Active team with this name already exists" });

    if (!req.file)
      return res.status(400).json({ message: "Team logo is required" });

    const result = await uploadToCloudinary(
      req.file.buffer,
      "cric_app_team_logos"
    );

    const team = new Team({ name, logo: result.secure_url });
    await team.save();

    // 👉 mark captain
    if (captainId) {
      await Player.findByIdAndUpdate(captainId, { isCaptain: true });
    }

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
    const { name, captainId } = req.body;

    const team = await Team.findById(teamId);
    if (!team || !team.isActive)
      return res.status(404).json({ message: "Team not found" });

    // Change name
    if (name && name !== team.name) {
      const exists = await Team.findOne({ name, isActive: true });
      if (exists)
        return res
          .status(400)
          .json({ message: "Another active team already has this name" });

      team.name = name;
    }

    // Replace logo
    if (req.file) {
      const result = await uploadToCloudinary(
        req.file.buffer,
        "cric_app_team_logos"
      );
      team.logo = result.secure_url;
    }

    await team.save();

    // 👉 captain logic
    if (captainId) {
      // remove captain from old players
      await Player.updateMany({ teamId, isCaptain: true }, { isCaptain: false });

      // assign new captain
      await Player.findByIdAndUpdate(captainId, { isCaptain: true });
    }

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

    // remove captain flag from all players
    await Player.updateMany({ teamId }, { isCaptain: false });

    res.json({ message: "Team soft-deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
