const express = require("express");
const router = express.Router();
const { createMatch } = require("../controllers/matchController");

router.post("/", createMatch);

module.exports = router;
