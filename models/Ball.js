const mongoose = require("mongoose");
const ballSchema = new mongoose.Schema({
    overId: { type: mongoose.Schema.Types.ObjectId, ref: "Over", required: true },
    ballNumber: { type: Number, required: true }, // 1..6 (can exceed for wides)
    striker: { type: mongoose.Schema.Types.ObjectId, ref: "Player", required: true },
    nonStriker: { type: mongoose.Schema.Types.ObjectId, ref: "Player", required: true },
    bowler: { type: mongoose.Schema.Types.ObjectId, ref: "Player", required: true },
    runs: { type: Number, default: 0 },
    isWide: { type: Boolean, default: false },
    isNoBall: { type: Boolean, default: false },
    isWicket: { type: Boolean, default: false },
    extraType: { type: String, enum: ["none", "wide", "noball", "bye"], default: "none" }
});
ballSchema.index({ overId: 1 });
module.exports = mongoose.model("Ball", ballSchema);
