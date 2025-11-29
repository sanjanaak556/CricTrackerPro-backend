const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");
const scorer = require("../middleware/scorerMiddleware");

const { createInnings, startInnings, getInningsByMatchId } = require("../controllers/inningsController");

// STEP 1: Create innings (admin only)
router.post("/", auth, admin, createInnings);

// STEP 2: Start innings (scorer only)
router.post("/start/:inningsId", auth, scorer, startInnings);

// GET innings by matchId
router.get("/match/:matchId", auth, getInningsByMatchId);


module.exports = router;
