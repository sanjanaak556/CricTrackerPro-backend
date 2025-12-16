const express = require("express");
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const auth = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");

const {
    getDashboardStats,
    getTeams,
    createTeam,
    updateTeam,
    deleteTeam,
    getPlayers,
    createPlayer,
    updatePlayer,
    deletePlayer
} = require("../controllers/adminController");

const {
    getAllMatches,
    createMatch,
    updateMatch,
    deleteMatch,
    completeMatch
} = require("../controllers/matchController");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/teams');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'team-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Get dashboard statistics (admin only)
router.get("/dashboard/stats", auth, admin, getDashboardStats);

// Team management routes (admin only)
router.get("/teams", auth, admin, getTeams);
router.post("/teams", auth, admin, upload.single('logo'), createTeam);
router.put("/teams/:id", auth, admin, upload.single('logo'), updateTeam);
router.delete("/teams/:id", auth, admin, deleteTeam);

// Player management routes (admin only)
router.get("/players", auth, admin, getPlayers);
router.post("/players", auth, admin, upload.single('image'), createPlayer);
router.put("/players/:id", auth, admin, upload.single('image'), updatePlayer);
router.delete("/players/:id", auth, admin, deletePlayer);

// Match management routes (admin only)
router.get("/matches", auth, admin, getAllMatches);
router.post("/matches", auth, admin, createMatch);
router.put("/matches/:id", auth, admin, updateMatch);
router.delete("/matches/:id", auth, admin, deleteMatch);
router.put("/matches/:id/complete", auth, admin, completeMatch);

module.exports = router;
