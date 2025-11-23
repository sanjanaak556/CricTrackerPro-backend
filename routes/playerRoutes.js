const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");
const upload = require("../utils/upload");

const {
    addPlayer,
    getPlayersByTeam,
    updatePlayer,
    deletePlayer
} = require("../controllers/playerController");

router.post("/", auth, admin, upload.single("image"), addPlayer);
router.get("/team/:teamId", auth, getPlayersByTeam);
router.put("/:playerId", auth, admin, upload.single("image"), updatePlayer);
router.delete("/:playerId", auth, admin, deletePlayer);

module.exports = router;
