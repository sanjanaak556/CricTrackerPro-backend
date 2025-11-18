const mongoose = require("mongoose");
const matchSchema = new mongoose.Schema({
    matchNumber: { type: Number },
    teamA: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true },
    teamB: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true },
    tossWinner: { type: mongoose.Schema.Types.ObjectId, ref: "Team" },
    electedTo: { type: String, enum: ["bat", "bowl"] },
    overs: { type: Number, default: 20 },
    status: { type: String, enum: ["upcoming", "live", "completed"], default: "upcoming" },
    currentScore: { runs: Number, wickets: Number, overs: String },
    scorerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

matchSchema.index({ status: 1 });
module.exports = mongoose.model("Match", matchSchema);
