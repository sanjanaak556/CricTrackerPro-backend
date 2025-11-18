const Ball = require("../models/Ball");
const Over = require("../models/Over");
const Innings = require("../models/Innings");
const Match = require("../models/Match");
const ScoreEvent = require("../models/ScoreEvent");
const Commentary = require("../models/Commentary");

// add a ball (scorer or admin)
exports.addBall = async (req, res) => {
  try {
    const { overId, ballNumber, striker, nonStriker, bowler, runs=0, isWide=false, isNoBall=false, isWicket=false, extraType="none", textCommentary } = req.body;

    // minimal validation
    const over = await Over.findById(overId);
    if (!over) return res.status(404).json({ message: "Over not found" });

    const innings = await Innings.findById(over.inningsId);
    if (!innings) return res.status(404).json({ message: "Innings not found" });

    const match = await Match.findById(innings.matchId);
    if (!match) return res.status(404).json({ message: "Match not found" });

    const ball = new Ball({ overId, ballNumber, striker, nonStriker, bowler, runs, isWide, isNoBall, isWicket, extraType });
    await ball.save();

    // create score event
    const ev = new ScoreEvent({
      matchId: match._id,
      inningsId: innings._id,
      overId: over._id,
      ballId: ball._id,
      batsman: striker,
      bowler,
      runs,
      isWicket,
      extraType
    });
    await ev.save();

    // update match currentScore (simple additive)
    match.currentScore = match.currentScore || { runs:0, wickets:0, overs:"0.0" };
    match.currentScore.runs = (match.currentScore.runs || 0) + runs;
    if (isWicket) match.currentScore.wickets = (match.currentScore.wickets || 0) + 1;

    // compute overs display - this is simplified
    // You should compute overs properly: overs = completedOvers + balls/6
    // For now we just append a rough string placeholder
    match.currentScore.overs = match.currentScore.overs || "0.0";

    await match.save();

    // optional: add commentary
    if (textCommentary) {
      const c = new Commentary({ matchId: match._id, inningsId: innings._id, text: textCommentary });
      await c.save();
    }

    res.status(201).json({ message: "Ball added", ball, event: ev });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
