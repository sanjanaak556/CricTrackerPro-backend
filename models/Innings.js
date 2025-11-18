const mongoose = require("mongoose");
const inningsSchema = new mongoose.Schema({
    matchId: { type: mongoose.Schema.Types.ObjectId, ref: "Match", required: true },
    battingTeam: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true },
    bowlingTeam: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true },
    inningsNumber: { type: Number, required: true }, // 1 or 2
    isActive: { type: Boolean, default: true }
});
inningsSchema.index({ matchId: 1 });
module.exports = mongoose.model("Innings", inningsSchema);
