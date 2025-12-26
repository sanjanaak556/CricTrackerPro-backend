const mongoose = require("mongoose");

const ballSchema = new mongoose.Schema(
  {
    matchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Match",
      required: true
    },

    inningsId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Innings",
      required: true
    },

    overId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Over",
      required: true
    },

    ballNumber: {
      type: Number,
      default: 0 // 1–6 for legal deliveries, set later
    },

    striker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Player",
      required: true
    },

    nonStriker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Player",
      required: true
    },

    bowler: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Player",
      required: true
    },

    runs: {
      type: Number,
      default: 0
    },

    extraType: {
      type: String,
      enum: ["none", "wide", "noball", "bye", "legbye"],
      default: "none"
    },

    isLegalDelivery: {
      type: Boolean,
      default: true
    },

    isWicket: {
      type: Boolean,
      default: false
    },
    wicketType: {
      type: String,
      enum: ["bowled", "caught", "lbw", "runout", "stumped", "hitwicket", "retired"],
      default: null
    },

    dismissedBatsman: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Player",
      default: null
    },

    customCommentary: {
      type: String,
      default: ""
    }
  },
  { timestamps: true }
);

// Indexes for better query speed
ballSchema.index({ matchId: 1 });
ballSchema.index({ inningsId: 1 });
ballSchema.index({ overId: 1 });

module.exports = mongoose.model("Ball", ballSchema);


