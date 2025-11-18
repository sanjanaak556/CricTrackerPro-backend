const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");
const playerController = require("../controllers/playerController");

router.post("/", auth, admin, playerController.addPlayer);
router.get("/team/:teamId", auth, playerController.getPlayersByTeam);
router.put("/:playerId", auth, admin, playerController.updatePlayer);
router.delete("/:playerId", auth, admin, playerController.deletePlayer);

module.exports = router;
