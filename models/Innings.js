const mongoose = require("mongoose");

const inningsSchema = new mongoose.Schema(
  {
    matchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Match",
      required: true,
    },

    battingTeam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },

    bowlingTeam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },

    inningsNumber: {
      type: Number,
      enum: [1, 2],
      required: true,
    },

    totalRuns: { type: Number, default: 0 },
    totalWickets: { type: Number, default: 0 },
    totalOvers: { type: String, default: "0.0" },

    striker: { type: mongoose.Schema.Types.ObjectId, ref: "Player" },
    nonStriker: { type: mongoose.Schema.Types.ObjectId, ref: "Player" },
    currentBowler: { type: mongoose.Schema.Types.ObjectId, ref: "Player" },

    balls: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Ball",
      },
    ],

    completed: { type: Boolean, default: false },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

inningsSchema.index({ matchId: 1, inningsNumber: 1 });

module.exports = mongoose.model("Innings", inningsSchema);
