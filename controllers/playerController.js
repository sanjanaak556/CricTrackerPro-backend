const Player = require("../models/Player");
const Team = require("../models/Team");
const uploadToCloudinary = require("../utils/uploadToCloudinary");

/* ============================= */
/* ADD PLAYER (Admin only) */
/* ============================= */
exports.addPlayer = async (req, res) => {
  try {
    const {
      name,
      role,
      teamId,
      matchesPlayed,
      runs,
      wickets,
      average,
      isCaptain // Add this
    } = req.body;

    if (!name || !role || !teamId) {
      return res.status(400).json({
        message: "Missing required fields: name, role, teamId",
      });
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

    const player = new Player({
      name,
      role,
      teamId,
      image: imageUrl,
      matchesPlayed: matchesPlayed || 0,
      runs: runs || 0,
      wickets: wickets || 0,
      average: average || 0,
      isCaptain: isCaptain === 'true' || isCaptain === true || false // Handle string or boolean
    });

    await player.save();

    // increment team playerCount
    await Team.findByIdAndUpdate(teamId, {
      $inc: { playerCount: 1 },
    });

    res.status(201).json({
      message: "Player added successfully",
      player,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ============================= */
/* GET ALL PLAYERS */
/* ============================= */
exports.getAllPlayers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const totalPlayers = await Player.countDocuments({ isActive: true });
    const totalPages = Math.ceil(totalPlayers / limit);

    const players = await Player.find({ isActive: true })
      .populate("teamId", "name")
      .select(
        "name role teamId image runs wickets matchesPlayed average strikeRate economy isActive isCaptain"
      )
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit);

    res.json({
      players,
      pagination: {
        currentPage: page,
        totalPages,
        totalPlayers,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ============================= */
/* GET PLAYERS OF ONE TEAM */
/* ============================= */
exports.getPlayersByTeam = async (req, res) => {
  try {
    const players = await Player.find({
      teamId: req.params.teamId,
      isActive: true,
    }).sort({ name: 1 });

    res.json(players);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ============================= */
/* UPDATE PLAYER (Admin only) */
/* ============================= */
exports.updatePlayer = async (req, res) => {
  try {
    const {
      name,
      role,
      isActive,
      matchesPlayed,
      runs,
      wickets,
      average,
      isCaptain // Add this
    } = req.body;

    const player = await Player.findById(req.params.playerId);
    if (!player)
      return res.status(404).json({ message: "Player not found" });

    if (name) player.name = name;

    if (role) {
      const validRoles = [
        "Batter",
        "Bowler",
        "All-Rounder",
        "Wicket-Keeper",
      ];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      player.role = role;
    }

    if (typeof isActive === "boolean") {
      // handle soft delete / restore
      if (player.isActive && isActive === false) {
        await Team.findByIdAndUpdate(player.teamId, {
          $inc: { playerCount: -1 },
        });
      }

      if (!player.isActive && isActive === true) {
        await Team.findByIdAndUpdate(player.teamId, {
          $inc: { playerCount: 1 },
        });
      }

      player.isActive = isActive;
    }

    if (matchesPlayed !== undefined) player.matchesPlayed = matchesPlayed;
    if (runs !== undefined) player.runs = runs;
    if (wickets !== undefined) player.wickets = wickets;
    if (average !== undefined) player.average = average;

    // Handle isCaptain - it comes as string 'true' or 'false' from FormData
    if (isCaptain !== undefined) {
      player.isCaptain = isCaptain === 'true' || isCaptain === true;
    }

    if (req.file) {
      const uploadResult = await uploadToCloudinary(
        req.file.buffer,
        "cric_app_players"
      );
      player.image = uploadResult.secure_url;
    }

    await player.save();

    res.json({
      message: "Player updated successfully",
      player,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ============================= */
/* SOFT DELETE PLAYER (Admin only) */
/* ============================= */
exports.deletePlayer = async (req, res) => {
  try {
    const player = await Player.findById(req.params.playerId);
    if (!player)
      return res.status(404).json({ message: "Player not found" });

    if (player.isActive) {
      player.isActive = false;
      await player.save();

      //  decrement team playerCount
      await Team.findByIdAndUpdate(player.teamId, {
        $inc: { playerCount: -1 },
      });
    }

    res.json({ message: "Player soft-deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ============================= */
/* SEARCH PLAYERS BY NAME */
/* ============================= */
exports.searchPlayers = async (req, res) => {
  try {
    const { name } = req.query;
    if (!name) {
      return res.status(400).json({ message: "Name query parameter is required" });
    }

    const players = await Player.find({
      name: { $regex: name, $options: "i" }, // Case-insensitive search
      isActive: true,
    })
      .populate("teamId", "name")
      .select("name role teamId image")
      .limit(10); // Limit results to 10

    res.json({ players });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
