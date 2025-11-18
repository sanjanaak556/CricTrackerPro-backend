const express = require("express");
const router = express.Router();
const { createInnings } = require("../controllers/inningsController");

router.post("/", createInnings);

module.exports = router;
