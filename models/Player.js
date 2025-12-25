const mongoose = require("mongoose");

const playerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    role: {
      type: String,
      enum: ["Batter", "Bowler", "All-Rounder", "Wicket-Keeper"],
      required: true,
    },
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },
    image: { type: String },
    runs: { type: Number, default: 0 },
    wickets: { type: Number, default: 0 },
    matchesPlayed: { type: Number, default: 0 },
    average: { type: Number, default: 0 },
    strikeRate: { type: Number, default: 0 },
    economy: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    isCaptain: { type: Boolean, default: false },
  },
  { timestamps: true }
);

playerSchema.index({ teamId: 1 });

module.exports = mongoose.model("Player", playerSchema);
