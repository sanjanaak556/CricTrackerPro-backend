const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");
const upload = require("../utils/upload");

const {
    createTeam,
    getTeams,
    updateTeam,
    deleteTeam,
    searchTeams
} = require("../controllers/teamController");

router.post("/", auth, admin, upload.single("logo"), createTeam);
router.get("/", auth, getTeams);
router.get("/search", auth, searchTeams);
router.put("/:teamId", auth, admin, upload.single("logo"), updateTeam);
router.delete("/:teamId", auth, admin, deleteTeam);

module.exports = router;


