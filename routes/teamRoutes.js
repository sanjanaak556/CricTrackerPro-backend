const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");
const teamController = require("../controllers/teamController");

router.post("/", auth, admin, teamController.createTeam);
router.get("/", auth, teamController.getTeams); // viewers can view (auth optional if you want public)
router.put("/:teamId", auth, admin, teamController.updateTeam);
router.delete("/:teamId", auth, admin, teamController.deleteTeam);

module.exports = router;


