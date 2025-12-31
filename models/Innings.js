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

    currentOverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Over",
      default: null
    },

    totalRuns: { type: Number, default: 0 },
    totalWickets: { type: Number, default: 0 },
    totalOvers: { type: String, default: "0.0" },

    striker: { type: mongoose.Schema.Types.ObjectId, ref: "Player" },
    nonStriker: { type: mongoose.Schema.Types.ObjectId, ref: "Player" },
    currentBowler: { type: mongoose.Schema.Types.ObjectId, ref: "Player" },

    // Current player stats for live display
    strikerRuns: { type: Number, default: 0 },
    strikerBalls: { type: Number, default: 0 },
    nonStrikerRuns: { type: Number, default: 0 },
    nonStrikerBalls: { type: Number, default: 0 },
    bowlerOvers: { type: String, default: "0.0" },
    bowlerRuns: { type: Number, default: 0 },
    bowlerWickets: { type: Number, default: 0 },

    // Full player stats for the innings
    batterStats: [
      {
        playerId: { type: mongoose.Schema.Types.ObjectId, ref: "Player" },
        name: String,
        runs: Number,
        balls: Number,
        fours: Number,
        sixes: Number,
        strikeRate: Number,
      },
    ],

    bowlerStats: [
      {
        playerId: { type: mongoose.Schema.Types.ObjectId, ref: "Player" },
        name: String,
        overs: String,
        maidens: Number,
        runs: Number,
        wickets: Number,
        economy: Number,
      },
    ],

    balls: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Ball",
      },
    ],

    // Track which over number the last striker/non-striker swap was applied for
    lastSwapOverNumber: { type: Number, default: 0 },

    completed: { type: Boolean, default: false },

    endReason: { type: String, default: null },

    isActive: { type: Boolean, default: true },

    fallOfWickets: [
      {
        wicketNumber: { type: Number, required: true },
        playerId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Player",
          required: true
        },
        scoreAtFall: { type: Number, required: true },
        overAtFall: { type: String, required: true },
        bowlerId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Player"
        },
        fielderId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Player"
        }
      }
    ],
  },
  { timestamps: true }
);

inningsSchema.index({ matchId: 1, inningsNumber: 1 });

module.exports = mongoose.model("Innings", inningsSchema);
