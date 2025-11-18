const mongoose = require("mongoose");
const scoreEventSchema = new mongoose.Schema({
    matchId: { type: mongoose.Schema.Types.ObjectId, ref: "Match", required: true },
    inningsId: { type: mongoose.Schema.Types.ObjectId, ref: "Innings", required: true },
    overId: { type: mongoose.Schema.Types.ObjectId, ref: "Over" },
    ballId: { type: mongoose.Schema.Types.ObjectId, ref: "Ball" },
    batsman: { type: mongoose.Schema.Types.ObjectId, ref: "Player" },
    bowler: { type: mongoose.Schema.Types.ObjectId, ref: "Player" },
    runs: Number,
    isWicket: Boolean,
    extraType: { type: String, enum: ["none", "wide", "noball", "bye"], default: "none" },
    createdAt: { type: Date, default: Date.now }
});
scoreEventSchema.index({ matchId: 1 });
module.exports = mongoose.model("ScoreEvent", scoreEventSchema);
