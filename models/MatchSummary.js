const mongoose = require("mongoose");
const matchSummarySchema = new mongoose.Schema({
    matchId: { type: mongoose.Schema.Types.ObjectId, ref: "Match", required: true },
    teamAStats: { runs: Number, wickets: Number, overs: Number },
    teamBStats: { runs: Number, wickets: Number, overs: Number },
    winner: String,
    topScorer: String,
    bestBowler: String,
    manOfTheMatch: String,
    createdAt: { type: Date, default: Date.now }
});
matchSummarySchema.index({ matchId: 1 });
module.exports = mongoose.model("MatchSummary", matchSummarySchema);
