const MatchSummary = require("../models/MatchSummary");
const ScoreEvent = require("../models/ScoreEvent");
const Match = require("../models/Match");

exports.generateSummary = async (req, res) => {
  try {
    const { matchId } = req.params;
    const match = await Match.findById(matchId);
    if (!match) return res.status(404).json({ message: "Match not found" });

    // simplistic aggregation example:
    // compute total runs, wickets for both teams using ScoreEvent collection
    const events = await ScoreEvent.find({ matchId });

    // compute stats (placeholder)
    const teamAStats = { runs: 0, wickets: 0, overs: 0 };
    const teamBStats = { runs: 0, wickets: 0, overs: 0 };

    // ...aggregate from events

    const summary = new MatchSummary({
      matchId,
      teamAStats,
      teamBStats,
      winner: "TBD",
      createdAt: new Date()
    });
    await summary.save();
    res.json({ message: "Summary generated", summary });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

