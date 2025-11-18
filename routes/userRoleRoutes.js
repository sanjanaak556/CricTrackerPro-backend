const express = require("express");
const router = express.Router();
const { createRole, getRoles } = require("../controllers/userRoleController");

router.post("/", createRole);
router.get("/", getRoles);

module.exports = router;






