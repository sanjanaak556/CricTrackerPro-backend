const Player = require("../models/Player");
const Team = require("../models/Team");
const uploadToCloudinary = require("../utils/uploadToCloudinary");

// ADD PLAYER (Admin only)
exports.addPlayer = async (req, res) => {
  try {
    const { name, role, teamId } = req.body;

    if (!name || !role || !teamId) {
      return res.status(400).json({ message: "Missing fields" });
    }

    // Check team exists
    const team = await Team.findById(teamId);
    if (!team || !team.isActive) {
      return res.status(400).json({ message: "Invalid or inactive team" });
    }

    let imageUrl = null;

    if (req.file) {
      const uploadResult = await uploadToCloudinary(
        req.file.buffer,
        "cric_app_players"
      );
      imageUrl = uploadResult.secure_url;
    }

    const player = new Player({ name, role, teamId, image: imageUrl });
    await player.save();

    res.status(201).json({ message: "Player added", player });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET PLAYERS OF ONE TEAM
exports.getPlayersByTeam = async (req, res) => {
  try {
    const players = await Player.find({
      teamId: req.params.teamId,
      isActive: true
    }).sort({ name: 1 });

    res.json(players);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// UPDATE PLAYER (Admin only)
exports.updatePlayer = async (req, res) => {
  try {
    const { name, role, isActive } = req.body;
    const player = await Player.findById(req.params.playerId);

    if (!player) return res.status(404).json({ message: "Player not found" });

    if (name) player.name = name;
    if (role) {
      const validRoles = ["Batter", "Bowler", "All-Rounder", "Wicket-Keeper"];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      player.role = role;
    }

    if (typeof isActive === "boolean") player.isActive = isActive;

    // Update image if provided
    if (req.file) {
      const uploadResult = await uploadToCloudinary(
        req.file.buffer,
        "cric_app_players"
      );
      player.image = uploadResult.secure_url;
    }

    await player.save();
    res.json({ message: "Player updated", player });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// SOFT DELETE PLAYER (Admin only)
exports.deletePlayer = async (req, res) => {
  try {
    const player = await Player.findById(req.params.playerId);

    if (!player) return res.status(404).json({ message: "Player not found" });

    player.isActive = false;
    await player.save();

    res.json({ message: "Player soft-deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


