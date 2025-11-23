const MatchSummary = require("../models/MatchSummary");
const Match = require("../models/Match");
const PDFDocument = require("pdfkit");

//  Create summary manually (Admin only)
exports.createMatchSummary = async (req, res) => {
  try {
    const {
      matchId,
      resultType,
      winnerTeamId,
      innings,
      topScorer,
      bestBowler,
      playerOfTheMatch
    } = req.body;

    // Check match exists
    const match = await Match.findById(matchId);
    if (!match) return res.status(404).json({ message: "Match not found" });

    // Prevent duplicate summary
    const existing = await MatchSummary.findOne({ matchId });
    if (existing)
      return res.status(400).json({ message: "Match summary already exists" });

    const summary = await MatchSummary.create({
      matchId,
      resultType,
      winnerTeamId,
      innings,
      topScorer,
      bestBowler,
      playerOfTheMatch
    });

    res.status(201).json({
      message: "Match summary created",
      summary
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

//  Get summary by match
exports.getSummaryByMatch = async (req, res) => {
  try {
    const summary = await MatchSummary.findOne({
      matchId: req.params.matchId
    })
      .populate("winnerTeamId", "name")
      .populate("innings.teamId", "name")
      .populate("innings.inningsId")
      .populate("topScorer.playerId", "name")
      .populate("bestBowler.playerId", "name")
      .populate("playerOfTheMatch", "name");

    if (!summary)
      return res.status(404).json({ message: "Match summary not found" });

    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

//  Update summary (Admin only)
exports.updateMatchSummary = async (req, res) => {
  try {
    const matchId = req.params.matchId;

    // Ensure match exists before updating
    const match = await Match.findById(matchId);
    if (!match)
      return res.status(404).json({ message: "Match not found" });

    const updated = await MatchSummary.findOneAndUpdate(
      { matchId },
      req.body,
      { new: true }
    );

    if (!updated)
      return res.status(404).json({ message: "Summary not found" });

    res.json({
      message: "Match summary updated",
      updated
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

//  Download Match Summary as PDF 
exports.downloadMatchSummaryPDF = async (req, res) => {
  try {
    const matchId = req.params.matchId;

    const summary = await MatchSummary.findOne({ matchId })
      .populate("winnerTeamId", "name")
      .populate("innings.teamId", "name")
      .populate("topScorer.playerId", "name")
      .populate("bestBowler.playerId", "name")
      .populate("playerOfTheMatch", "name");

    if (!summary) {
      return res.status(404).json({ message: "Match summary not found" });
    }

    // create PDF document
    const doc = new PDFDocument();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=match-summary-${matchId}.pdf`
    );

    doc.pipe(res);

    // title
    doc.fontSize(22).text("Match Summary", { align: "center" });
    doc.moveDown();

    doc.fontSize(14).text(`Match ID: ${matchId}`);
    doc.text(`Result Type: ${summary.resultType}`);
    doc.text(`Winner Team: ${summary.winnerTeamId?.name || "N/A"}`);
    doc.moveDown();

    // innings
    doc.fontSize(16).text("Innings Details:", { underline: true });
    summary.innings.forEach((inn, i) => {
      doc.fontSize(14).text(
        `Innings ${i + 1} - ${inn.teamId?.name || "Team"}`
      );
      doc.text(`Runs: ${inn.runs}`);
      doc.text(`Wickets: ${inn.wickets}`);
      doc.text(`Overs: ${inn.overs}`);
      doc.moveDown();
    });

    // top Scorer
    doc.fontSize(16).text("Top Scorer:", { underline: true });
    doc.fontSize(14).text(
      `${summary.topScorer.playerId?.name || "N/A"} - ${summary.topScorer.runs} Runs`
    );
    doc.moveDown();

    // best Bowler
    doc.fontSize(16).text("Best Bowler:", { underline: true });
    doc.fontSize(14).text(
      `${summary.bestBowler.playerId?.name || "N/A"} - ${summary.bestBowler.wickets} Wickets`
    );
    doc.moveDown();

    // player of Match
    doc.fontSize(16).text("Player of the Match:", { underline: true });
    doc.fontSize(14).text(summary.playerOfTheMatch?.name || "N/A");

    doc.end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
