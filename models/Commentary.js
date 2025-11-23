const mongoose = require("mongoose");

const commentarySchema = new mongoose.Schema(
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

    ballId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ball",
      required: true
    },

    text: {
      type: String,
      required: true
    },

    type: {
      type: String,
      enum: ["NORMAL", "FOUR", "SIX", "WICKET", "EXTRA", "INFO"],
      default: "NORMAL"
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
  { timestamps: true }
);

commentarySchema.index({ matchId: 1, inningsId: 1 });

module.exports = mongoose.model("Commentary", commentarySchema);
