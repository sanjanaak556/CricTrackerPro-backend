const mongoose = require("mongoose");

const matchSummarySchema = new mongoose.Schema(
  {
    matchId: { type: mongoose.Schema.Types.ObjectId, ref: "Match", required: true, unique: true },
    resultType: {
      type: String,
      enum: ["WIN", "TIE", "NO_RESULT", "ABANDONED", "SUPER_OVER"],
      required: true
    },

    winnerTeamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team"
    },

    innings:
      [
        {
          inningsId: { type: mongoose.Schema.Types.ObjectId, ref: "Innings" },
          teamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team" },
          runs: Number,
          wickets: Number,
          overs: Number
        }
      ],

    topScorer: {
      playerId: { type: mongoose.Schema.Types.ObjectId, ref: "Player" },
      runs: Number
    },

    bestBowler: {
      playerId: { type: mongoose.Schema.Types.ObjectId, ref: "Player" },
      wickets: Number
    },

    playerOfTheMatch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Player"
    }
  },
  { timestamps: true }
);

matchSummarySchema.index({ matchId: 1 });

module.exports = mongoose.model("MatchSummary", matchSummarySchema);
