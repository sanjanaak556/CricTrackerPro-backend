const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const scorer = require("../middleware/scorerMiddleware");
const ballController = require("../controllers/ballController");

router.post("/add", auth, scorer, ballController.addBall);

module.exports = router;

