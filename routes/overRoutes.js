const express = require("express");
const router = express.Router();
const { createOver } = require("../controllers/overController");

router.post("/", createOver);

module.exports = router;
