const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");
const scorer = require("../middleware/scorerMiddleware");

const { createInnings, startInnings } = require("../controllers/inningsController");

// STEP 1: Create innings (admin only)
router.post("/", auth, admin, createInnings);

// STEP 2: Start innings (scorer only)
router.post("/start/:inningsId", auth, scorer, startInnings);

module.exports = router;
