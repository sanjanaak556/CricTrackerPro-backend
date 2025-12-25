const mongoose = require("mongoose");

const teamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    logo: {
      type: String,
    },

    captain: {
      type: String,
      trim: true,
      required: true,
    },

    playerCount: {
      type: Number,
      default: 0,
    },

    matchesPlayed: {
      type: Number,
      default: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Team", teamSchema);
