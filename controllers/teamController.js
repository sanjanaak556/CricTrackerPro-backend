const Team = require("../models/Team");
const uploadToCloudinary = require("../utils/uploadToCloudinary");

/* ================================
   CREATE TEAM (Admin)
================================ */
exports.createTeam = async (req, res) => {
  try {
    const { name, captain, playerCount, matchesPlayed } = req.body;

    if (!name || !captain) {
      return res
        .status(400)
        .json({ message: "Team name and captain are required" });
    }

    const exists = await Team.findOne({ name, isActive: true });
    if (exists) {
      return res
        .status(400)
        .json({ message: "Active team with this name already exists" });
    }

    let logoUrl = null;
    if (req.file) {
      const result = await uploadToCloudinary(
        req.file.buffer,
        "cric_app_team_logos"
      );
      logoUrl = result.secure_url;
    }

    const team = new Team({
      name,
      captain: captain.trim(),
      logo: logoUrl,
      playerCount: Number(playerCount) || 0,
      matchesPlayed: Number(matchesPlayed) || 0,
    });

    await team.save();

    res.status(201).json({
      message: "Team created successfully",
      team,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ================================
   GET ALL ACTIVE TEAMS
================================ */
exports.getTeams = async (req, res) => {
  try {
    const teams = await Team.find({ isActive: true }).sort({ name: 1 });
    res.json({ teams });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ================================
   UPDATE TEAM (Admin)
================================ */
exports.updateTeam = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { name, captain, playerCount, matchesPlayed } = req.body;

    const team = await Team.findById(teamId);
    if (!team || !team.isActive) {
      return res.status(404).json({ message: "Team not found" });
    }

    // update name (with uniqueness check)
    if (name && name !== team.name) {
      const exists = await Team.findOne({
        name,
        isActive: true,
        _id: { $ne: teamId },
      });

      if (exists) {
        return res
          .status(400)
          .json({ message: "Another active team already has this name" });
      }

      team.name = name;
    }

    // update captain (STRING)
    if (captain) {
      team.captain = captain.trim();
    }

    // update counts
    if (playerCount !== undefined) {
      team.playerCount = Number(playerCount);
    }

    if (matchesPlayed !== undefined) {
      team.matchesPlayed = Number(matchesPlayed);
    }

    // replace logo
    if (req.file) {
      const result = await uploadToCloudinary(
        req.file.buffer,
        "cric_app_team_logos"
      );
      team.logo = result.secure_url;
    }

    await team.save();

    res.json({
      message: "Team updated successfully",
      team,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ================================
   SOFT DELETE TEAM
================================ */
exports.deleteTeam = async (req, res) => {
  try {
    const { teamId } = req.params;

    const team = await Team.findById(teamId);
    if (!team || !team.isActive) {
      return res.status(404).json({ message: "Team not found" });
    }

    team.isActive = false;
    await team.save();

    res.json({ message: "Team soft-deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ================================
   SEARCH TEAMS BY NAME
================================ */
exports.searchTeams = async (req, res) => {
  try {
    const { name } = req.query;
    if (!name) {
      return res.status(400).json({ message: "Name query parameter is required" });
    }

    const teams = await Team.find({
      name: { $regex: name, $options: "i" }, // Case-insensitive search
      isActive: true,
    })
      .select("name logo")
      .limit(10); // Limit results to 10

    res.json({ teams });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
