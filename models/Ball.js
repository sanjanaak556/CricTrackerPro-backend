const mongoose = require("mongoose");

const ballSchema = new mongoose.Schema(
  {
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
      required: true // 1–6 for legal balls
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
    }
  },
  { timestamps: true }
);

ballSchema.index({ inningsId: 1 });
ballSchema.index({ overId: 1 });

module.exports = mongoose.model("Ball", ballSchema);


