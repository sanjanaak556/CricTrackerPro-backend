const mongoose = require("mongoose");

const matchSummarySchema = new mongoose.Schema(
  {
    matchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Match",
      required: true,
    },

    team1: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },
    team2: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },

    inningsDetails: [
      {
        inningsId: { type: mongoose.Schema.Types.ObjectId, ref: "Innings" },

        teamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team" },

        runs: Number,
        wickets: Number,
        overs: String,

        extras: {
          wides: { type: Number, default: 0 },
          noBalls: { type: Number, default: 0 },
          byes: { type: Number, default: 0 },
          legByes: { type: Number, default: 0 },
          total: { type: Number, default: 0 },
        },

        runRate: { type: Number },

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

        fallOfWickets: [
          {
            wicketNumber: Number,
            playerId: { type: mongoose.Schema.Types.ObjectId, ref: "Player" },
            scoreAtFall: Number,
            overAtFall: String,
          },
        ],
      },
    ],

    topScorer: {
      playerId: { type: mongoose.Schema.Types.ObjectId, ref: "Player" },
      runs: Number,
    },

    bestBowler: {
      playerId: { type: mongoose.Schema.Types.ObjectId, ref: "Player" },
      wickets: Number,
      runsConceded: Number,
    },

    playerOfTheMatch: { type: mongoose.Schema.Types.ObjectId, ref: "Player" },

    winnerTeamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team" },
    winType: {
      type: String,
      enum: ["runs", "wickets", "tie", "no-result"],
    },

    winMargin: Number,

    resultText: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("MatchSummary", matchSummarySchema);
