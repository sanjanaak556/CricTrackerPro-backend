const mongoose = require("mongoose");

const matchSchema = new mongoose.Schema(
  {
    matchNumber: { type: Number, required: true, unique: true },
    matchName: {
      type: String,
      required: true,
      trim: true,
    },

    matchType: {
      type: String,
      enum: ["T20", "ODI", "TEST", "OTHER"],
      required: true,
      default: "OTHER",
    },

    teamA: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },
    teamB: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },
    tossWinner: { type: mongoose.Schema.Types.ObjectId, ref: "Team" },
    electedTo: {
      type: String,
      enum: ["bat", "bowl"],
    },

    overs: {
      type: Number,
      default: function () {
        return this.matchType === "ODI"
          ? 50
          : this.matchType === "TEST"
            ? 90
            : 20;
      },
    },

    status: {
      type: String,
      enum: ["upcoming", "live", "completed", "abandoned", "postponed"],
      default: "upcoming",
    },

    scheduledAt: {
      type: Date,
      required: true,
    },

    statusReason: {
      type: String, // "Rain", "Wet outfield", "Floodlights failure"
    },

    statusNote: {
      type: String, // "New date will be announced soon"
    },

    abandonedAt: Date,
    postponedAt: Date,

    venue: {
      name: { type: String, required: true },
      city: { type: String },
      groundType: { type: String }, // Stadium | Turf | Academy
    },

    umpires: [
      {
        name: { type: String },
        role: { type: String, enum: ["on-field", "third-umpire"] },
      },
    ],

    scorerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    currentInnings: { type: mongoose.Schema.Types.ObjectId, ref: "Innings" },
    striker: { type: mongoose.Schema.Types.ObjectId, ref: "Player" },
    nonStriker: { type: mongoose.Schema.Types.ObjectId, ref: "Player" },
    currentBowler: { type: mongoose.Schema.Types.ObjectId, ref: "Player" },
    currentScore: {
      runs: { type: Number, default: 0 },
      wickets: { type: Number, default: 0 },
      overs: { type: String, default: "0.0" },
    },

    target: { type: Number, default: null },

    winnerTeam: { type: mongoose.Schema.Types.ObjectId, ref: "Team" },
    winType: {
      type: String,
      enum: ["runs", "wickets", "superover"],
      default: null,
    },

    winMargin: { type: Number, default: null },
    playerOfTheMatch: { type: mongoose.Schema.Types.ObjectId, ref: "Player" },
    innings: [{ type: mongoose.Schema.Types.ObjectId, ref: "Innings" }],

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

matchSchema.index({ status: 1 });

module.exports = mongoose.model("Match", matchSchema);
