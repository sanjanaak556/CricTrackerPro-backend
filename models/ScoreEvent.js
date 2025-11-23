const mongoose = require("mongoose");

const scoreEventSchema = new mongoose.Schema(
  {
    matchId: { type: mongoose.Schema.Types.ObjectId, ref: "Match", required: true },
    inningsId: { type: mongoose.Schema.Types.ObjectId, ref: "Innings", required: true },
    overId: { type: mongoose.Schema.Types.ObjectId, ref: "Over", required: true },
    ballId: { type: mongoose.Schema.Types.ObjectId, ref: "Ball", required: true },

    batter: { type: mongoose.Schema.Types.ObjectId, ref: "Player", required: true },
    bowler: { type: mongoose.Schema.Types.ObjectId, ref: "Player", required: true },

    eventType: {
      type: String,
      enum: ["RUN", "FOUR", "SIX", "WICKET", "EXTRA"],
      required: true
    },

    runs: { type: Number, default: 0 },

    extraType: {
      type: String,
      enum: ["none", "wide", "noball", "bye", "legbye"],
      default: "none"
    },

    wicketType: {
      type: String,
      enum: ["none", "bowled", "caught", "lbw", "runout", "stumped", "hitwicket"],
      default: "none"
    },

    description: { type: String }
  },
  { timestamps: true }
);

scoreEventSchema.index({ matchId: 1, inningsId: 1 });

module.exports = mongoose.model("ScoreEvent", scoreEventSchema);
