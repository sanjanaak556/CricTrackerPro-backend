const mongoose = require("mongoose");

const userRoleSchema = new mongoose.Schema({
    roleName: {
        type: String,
        enum: ["admin", "scorer", "viewer"],
        required: true,
        unique: true,
    },
});

module.exports = mongoose.model("UserRole", userRoleSchema);
