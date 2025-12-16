const mongoose = require("mongoose");

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  playerCount: {
    type: Number,
    required: true,
    min: 0,
  },
  matchesPlayed: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },
  logo: {
    type: String, // URL to the uploaded logo image
    default: null,
    required : true
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt field before saving
teamSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Team", teamSchema);
