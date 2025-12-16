const MatchSummary = require("../models/MatchSummary");
const Match = require("../models/Match");
const PDFDocument = require("pdfkit");
const Innings = require("../models/Innings");
const Ball = require("../models/Ball");
const { getIO } = require("../services/socket");

// Create summary manually (Admin only)
exports.createMatchSummary = async (req, res) => {
  try {
    const {
      matchId,
      topScorer,
      bestBowler,
      playerOfTheMatch,
      winnerTeamId,
      winType,
      winMargin,
      resultText,
    } = req.body;

    // Check match exists
    const match = await Match.findById(matchId);
    if (!match) return res.status(404).json({ message: "Match not found" });

    // Prevent duplicate summary
    const existing = await MatchSummary.findOne({ matchId });
    if (existing) {
      return res.status(400).json({ message: "Summary already exists" });
    }

    // Validate winnerTeamId is one of the match teams
    if (
      winnerTeamId &&
      ![match.teamA.toString(), match.teamB.toString()].includes(winnerTeamId)
    ) {
      return res.status(400).json({
        message: "winnerTeamId must be either teamA or teamB of this match",
      });
    }

    // Create the summary
    const summary = await MatchSummary.create({
      matchId,
      team1: match.teamA,
      team2: match.teamB,
      topScorer,
      bestBowler,
      playerOfTheMatch,
      winnerTeamId,
      winType,
      winMargin,
      resultText,
    });

    return res.status(201).json({
      message: "Match summary created",
      summary,
    });
  } catch (error) {
    console.error("Create match summary error:", error);
    return res.status(500).json({ error: error.message });
  }
};

// List all Summaries
exports.listAllSummaries = async (req, res) => {
  try {
    const summaries = await MatchSummary.find()
      .populate("team1 team2 playerOfTheMatch winnerTeamId")
      .sort({ createdAt: -1 });

    res.json(summaries);
  } catch (err) {
    console.error("List summaries error:", err);
    res.status(500).json({ message: "Failed to fetch reports" });
  }
};

// Get summary by match
exports.getSummaryByMatch = async (req, res) => {
  try {
    const summary = await MatchSummary.findOne({
      matchId: req.params.matchId,
    })
      .populate("team1", "name")
      .populate("team2", "name")
      .populate("winnerTeamId", "name")
      .populate("inningsDetails.teamId", "name")
      .populate("inningsDetails.inningsId")
      .populate("inningsDetails.fallOfWickets.playerId", "name")
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

// Get summary by ID
exports.getSummaryById = async (req, res) => {
  try {
    const summary = await MatchSummary.findById(req.params.id)
      .populate("team1", "name")
      .populate("team2", "name")
      .populate("winnerTeamId", "name")
      .populate("inningsDetails.teamId", "name")
      .populate("inningsDetails.inningsId")
      .populate("inningsDetails.fallOfWickets.playerId", "name")
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

// Update summary (Admin only)
exports.updateMatchSummary = async (req, res) => {
  try {
    const matchId = req.params.matchId;

    const match = await Match.findById(matchId);
    if (!match) return res.status(404).json({ message: "Match not found" });

    const updated = await MatchSummary.findOneAndUpdate({ matchId }, req.body, {
      new: true,
    });

    if (!updated) return res.status(404).json({ message: "Summary not found" });

    res.json({
      message: "Match summary updated",
      updated,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Download Match Summary as PDF
exports.downloadMatchSummaryPDF = async (req, res) => {
  try {
    const { matchId } = req.params;

    /* -----------------------------
        FETCH MATCH (MAIN INFO)
    ----------------------------- */
    const match = await Match.findById(matchId)
      .populate("teamA", "name")
      .populate("teamB", "name")
      .populate("tossWinner", "name")
      .populate("winnerTeam", "name")
      .populate("playerOfTheMatch", "name");

    if (!match) {
      return res.status(404).json({ message: "Match not found" });
    }

    if (match.status !== "completed") {
      return res.status(400).json({
        message: "Match is not completed yet. Summary unavailable.",
      });
    }

    /* -----------------------------
        FETCH MATCH SUMMARY
    ----------------------------- */
    const summary = await MatchSummary.findOne({ matchId })
      .populate("team1", "name")
      .populate("team2", "name")
      .populate("winnerTeamId", "name")
      .populate("inningsDetails.teamId", "name")
      .populate("inningsDetails.fallOfWickets.playerId", "name")
      .populate("topScorer.playerId", "name")
      .populate("bestBowler.playerId", "name")
      .populate("playerOfTheMatch", "name");

    if (!summary) {
      return res.status(404).json({ message: "Match summary not found" });
    }

    /* -----------------------------
        PDF SETUP
    ----------------------------- */
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=match-summary-${match.matchNumber}.pdf`
    );

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);

    /* =====================================================
        HEADER
    ===================================================== */
    doc.fontSize(22).text("MATCH SUMMARY", { align: "center" });
    doc.moveDown();

    doc.fontSize(14).text(`Match: ${match.matchName}`);
    doc.text(`Match Number: ${match.matchNumber}`);
    doc.text(`Format: ${match.matchType}`);
    doc.text(`Teams: ${match.teamA.name} vs ${match.teamB.name}`);
    doc.text(
      `Venue: ${match.venue.name}${
        match.venue.city ? ", " + match.venue.city : ""
      }`
    );
    doc.text(`Scheduled Date: ${new Date(match.scheduledAt).toDateString()}`);
    doc.text(`Status: Completed`);
    doc.moveDown();

    /* -----------------------------
        UMPIRES
    ----------------------------- */
    if (match.umpires?.length > 0) {
      doc.fontSize(14).text("Umpires:");
      match.umpires.forEach((u) => {
        doc.fontSize(12).text(`• ${u.name} (${u.role})`);
      });
      doc.moveDown();
    }

    /* -----------------------------
        TOSS & RESULT
    ----------------------------- */
    doc
      .fontSize(14)
      .text(
        `Toss: ${match.tossWinner?.name || "—"} elected to ${
          match.electedTo || "—"
        }`
      );
    doc.moveDown();

    doc.fontSize(14).text(`Result: ${summary.resultText}`);
    doc.text(`Winner: ${summary.winnerTeamId?.name || "—"}`);
    doc.text(`Win Margin: ${summary.winMargin || ""} ${summary.winType || ""}`);
    doc.moveDown(1.5);

    /* =====================================================
        INNINGS DETAILS
    ===================================================== */
    summary.inningsDetails.forEach((inn, idx) => {
      doc
        .fontSize(18)
        .text(`Innings ${idx + 1} — ${inn.teamId?.name}`, { underline: true });
      doc.moveDown(0.5);

      doc
        .fontSize(13)
        .text(
          `Runs: ${inn.runs} | Wickets: ${inn.wickets} | Overs: ${inn.overs}`
        );

      if (inn.extras) {
        doc.text(
          `Extras: ${inn.extras.total} (w ${inn.extras.wides}, nb ${inn.extras.noBalls}, b ${inn.extras.byes}, lb ${inn.extras.legByes})`
        );
      }

      if (inn.runRate) {
        doc.text(`Run Rate: ${inn.runRate}`);
      }

      doc.moveDown();

      /* -----------------------------
          BATTING
      ----------------------------- */
      doc.fontSize(15).text("Batting");
      doc.fontSize(11).text("Name   R  B  4s  6s  SR");

      Object.values(inn.batterStats || {}).forEach((b) => {
        doc.text(
          `${b.name}   ${b.runs}  ${b.balls}  ${b.fours}  ${b.sixes}  ${b.strikeRate}`
        );
      });

      doc.moveDown();

      /* -----------------------------
          BOWLING
      ----------------------------- */
      doc.fontSize(15).text("Bowling");
      doc.fontSize(11).text("Name   O  M  R  W  Econ");

      Object.values(inn.bowlerStats || {}).forEach((b) => {
        doc.text(
          `${b.name}   ${b.overs}  ${b.maidens}  ${b.runs}  ${b.wickets}  ${b.economy}`
        );
      });

      doc.moveDown();

      /* -----------------------------
          FALL OF WICKETS
      ----------------------------- */
      doc.fontSize(15).text("Fall of Wickets");

      if (inn.fallOfWickets?.length > 0) {
        inn.fallOfWickets.forEach((f) => {
          doc
            .fontSize(11)
            .text(
              `${f.wicketNumber}. ${f.playerId?.name} — ${f.scoreAtFall} (${f.overAtFall})`
            );
        });
      } else {
        doc.fontSize(11).text("No wickets");
      }

      doc.moveDown(1.5);
    });

    /* =====================================================
        AWARDS
    ===================================================== */
    doc.fontSize(18).text("Awards", { underline: true });
    doc.moveDown();

    doc
      .fontSize(14)
      .text(
        `Top Scorer: ${summary.topScorer?.playerId?.name || "—"} (${
          summary.topScorer?.runs || 0
        } runs)`
      );

    doc
      .fontSize(14)
      .text(
        `Best Bowler: ${summary.bestBowler?.playerId?.name || "—"} (${
          summary.bestBowler?.wickets || 0
        } wickets)`
      );

    doc
      .fontSize(14)
      .text(`Player of the Match: ${summary.playerOfTheMatch?.name || "—"}`);

    doc.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to generate PDF" });
  }
};

// -----------------------------------------------------------
// AUTO GENERATE MATCH SUMMARY
// -----------------------------------------------------------
exports.autoGenerateSummary = async (req, res) => {
  try {
    const matchId = req.params.matchId;

    const match = await Match.findById(matchId)
      .populate("teamA", "name")
      .populate("teamB", "name");

    if (!match) return res.status(404).json({ message: "Match not found" });

    // Fetch innings
    const inningsList = await Innings.find({ matchId })
      .populate("battingTeam", "name")
      .populate("bowlingTeam", "name")
      .lean();

    if (inningsList.length === 0)
      return res.status(400).json({ message: "No innings found" });

    let summaryInnings = [];

    // -----------------------------------------------------------
    // PROCESS EACH INNINGS
    // -----------------------------------------------------------
    for (const inn of inningsList) {
      // SAFETY CHECK — innings without battingTeam should be skipped
      if (!inn.battingTeam) {
        console.warn("⚠ Missing battingTeam for innings:", inn._id);
        continue;
      }

      const balls = await Ball.find({ inningsId: inn._id })
        .populate("striker", "name")
        .populate("bowler", "name")
        .populate("nonStriker", "name")
        .lean();

      const batterStats = {};
      const bowlerStats = {};
      const fallOfWickets = [];

      let totalRuns = 0;
      let totalWickets = 0;
      let legalBalls = 0;

      for (const ball of balls) {
        const strikerId = ball.striker?._id?.toString() || "unknown_striker";
        const bowlerId = ball.bowler?._id?.toString() || "unknown_bowler";

        // ----------------------------
        // BATTER STATS
        // ----------------------------
        if (!batterStats[strikerId]) {
          batterStats[strikerId] = {
            name: ball.striker?.name || "Unknown Batter",
            runs: 0,
            balls: 0,
            fours: 0,
            sixes: 0,
            strikeRate: 0,
          };
        }

        if (ball.isLegalDelivery) batterStats[strikerId].balls++;

        // valid batting runs
        if (
          ball.extraType === "none" ||
          ball.extraType === "bye" ||
          ball.extraType === "legbye"
        ) {
          batterStats[strikerId].runs += ball.runs;
        }

        if (ball.runs === 4) batterStats[strikerId].fours++;
        if (ball.runs === 6) batterStats[strikerId].sixes++;

        // ----------------------------
        // BOWLER STATS
        // ----------------------------
        if (!bowlerStats[bowlerId]) {
          bowlerStats[bowlerId] = {
            name: ball.bowler?.name || "Unknown Bowler",
            balls: 0,
            runs: 0,
            wickets: 0,
            overs: "0.0",
            economy: 0,
          };
        }

        if (ball.isLegalDelivery) {
          bowlerStats[bowlerId].balls++;
          legalBalls++;
        }

        // runs conceded
        if (ball.extraType === "wide" || ball.extraType === "noball") {
          bowlerStats[bowlerId].runs += ball.runs + 1;
        } else {
          bowlerStats[bowlerId].runs += ball.runs;
        }

        // wickets
        if (ball.isWicket && ball.extraType !== "wide") {
          bowlerStats[bowlerId].wickets++;

          fallOfWickets.push({
            wicketNumber: totalWickets + 1,
            playerId: strikerId,
            scoreAtFall: totalRuns,
            overAtFall: `${Math.floor(legalBalls / 6)}.${legalBalls % 6}`,
          });

          totalWickets++;
        }

        // ----------------------------
        // TEAM RUNS
        // ----------------------------
        if (ball.extraType === "wide" || ball.extraType === "noball") {
          totalRuns += ball.runs + 1;
        } else {
          totalRuns += ball.runs;
        }
      }

      // Strike rate
      Object.values(batterStats).forEach((b) => {
        b.strikeRate =
          b.balls === 0 ? 0 : Number(((b.runs / b.balls) * 100).toFixed(2));
      });

      // Overs + Economy
      Object.values(bowlerStats).forEach((b) => {
        const overs = Math.floor(b.balls / 6);
        const balls = b.balls % 6;
        b.overs = `${overs}.${balls}`;
        b.economy =
          b.balls === 0 ? 0 : Number((b.runs / (b.balls / 6)).toFixed(2));
      });

      // PUSH INNINGS DATA
      summaryInnings.push({
        inningsId: inn._id,
        teamId: inn.battingTeam?._id || null,
        teamName: inn.battingTeam?.name || "Unknown Team",
        runs: totalRuns,
        wickets: totalWickets,
        overs: `${Math.floor(legalBalls / 6)}.${legalBalls % 6}`,
        batterStats,
        bowlerStats,
        fallOfWickets,
      });
    }

    // -----------------------------------------------------------
    // WINNER LOGIC
    // -----------------------------------------------------------
    let winnerTeamId = null,
      winType = null,
      winMargin = null,
      resultText = "Match Completed";

    if (summaryInnings.length === 2) {
      const [inn1, inn2] = summaryInnings;

      if (inn1.runs > inn2.runs) {
        winnerTeamId = inn1.teamId;
        winType = "runs";
        winMargin = inn1.runs - inn2.runs;
        resultText = `${inn1.teamName} won by ${winMargin} runs`;
      } else {
        winnerTeamId = inn2.teamId;
        winType = "wickets";
        winMargin = 10 - inn2.wickets;
        resultText = `${inn2.teamName} won by ${winMargin} wickets`;
      }
    }

    // -----------------------------------------------------------
    // TOP SCORER + BEST BOWLER
    // -----------------------------------------------------------
    let topScorer = { playerId: null, runs: 0 };
    let bestBowler = { playerId: null, wickets: 0 };

    summaryInnings.forEach((inn) => {
      for (const [playerId, b] of Object.entries(inn.batterStats)) {
        if (b.runs > topScorer.runs) topScorer = { playerId, runs: b.runs };
      }
      for (const [playerId, b] of Object.entries(inn.bowlerStats)) {
        if (b.wickets > bestBowler.wickets)
          bestBowler = { playerId, wickets: b.wickets };
      }
    });

    // -----------------------------------------------------------
    // SAVE / UPDATE SUMMARY
    // -----------------------------------------------------------
    const summary = await MatchSummary.findOneAndUpdate(
      { matchId },
      {
        matchId,
        team1: match.teamA,
        team2: match.teamB,
        inningsDetails: summaryInnings,
        winnerTeamId,
        winType,
        winMargin,
        resultText,
        topScorer,
        bestBowler,
        playerOfTheMatch: topScorer.playerId,
      },
      { upsert: true, new: true }
    );

    // Emit socket update
    getIO().emit("matchSummaryUpdated", summary);

    res.json({
      message: "Auto summary generated successfully",
      summary,
    });
  } catch (err) {
    console.error("Auto Summary Error:", err);
    res.status(500).json({ error: err.message });
  }
};
