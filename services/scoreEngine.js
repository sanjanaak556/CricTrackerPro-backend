const Match = require("../models/Match");
const Innings = require("../models/Innings");
const Over = require("../models/Over");
const Ball = require("../models/Ball");
const { getIO } = require("../services/socket");

/* ===================== UTILITIES ===================== */
const isLegalDelivery = (extraType) =>
  !["wide", "noball"].includes(extraType);

const extraRuns = (extraType, runs = 0) => {
  if (extraType === "wide" || extraType === "noball") return 1;
  if (extraType === "bye" || extraType === "legbye") return runs;
  return 0;
};

const rotateStrike = (innings) => {
  const temp = innings.striker;
  innings.striker = innings.nonStriker;
  innings.nonStriker = temp;
};

/* ===================== CALCULATE PLAYER STATS ===================== */
const calculatePlayerStats = async (innings) => {
  const Ball = require("../models/Ball");
  const Player = require("../models/Player");

  // Get all balls for this innings
  const balls = await Ball.find({ inningsId: innings._id }).populate('bowler striker');

  // Initialize stats objects
  const batterStats = {};
  const bowlerStats = {};

  // Calculate stats for all batters
  balls.forEach(ball => {
    if (ball.striker) {
      const strikerId = ball.striker._id.toString();

      if (!batterStats[strikerId]) {
        batterStats[strikerId] = {
          playerId: ball.striker._id,
          name: ball.striker.name || "Unknown Batter",
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          strikeRate: 0,
        };
      }

      if (ball.isLegalDelivery) batterStats[strikerId].balls++;
      batterStats[strikerId].runs += ball.runs;

      if (ball.runs === 4) batterStats[strikerId].fours++;
      if (ball.runs === 6) batterStats[strikerId].sixes++;
    }
  });

  // Calculate stats for all bowlers
  balls.forEach(ball => {
    if (ball.bowler) {
      const bowlerId = ball.bowler._id.toString();

      if (!bowlerStats[bowlerId]) {
        bowlerStats[bowlerId] = {
          playerId: ball.bowler._id,
          name: ball.bowler.name || "Unknown Bowler",
          overs: "0.0",
          maidens: 0,
          runs: 0,
          wickets: 0,
          economy: 0,
          legalDeliveries: 0,
        };
      }

      if (ball.isLegalDelivery) {
        bowlerStats[bowlerId].legalDeliveries++;
      }

      bowlerStats[bowlerId].runs += ball.runs + extraRuns(ball.extraType, ball.runs);
      if (ball.isWicket && ball.extraType !== "wide") {
        bowlerStats[bowlerId].wickets++;
      }
    }
  });

  // Calculate derived stats for batters
  Object.values(batterStats).forEach(batter => {
    batter.strikeRate = batter.balls > 0 ? (batter.runs / batter.balls) * 100 : 0;
  });

  // Calculate derived stats for bowlers
  Object.values(bowlerStats).forEach(bowler => {
    const overs = Math.floor(bowler.legalDeliveries / 6);
    const ballsInOver = bowler.legalDeliveries % 6;
    bowler.overs = `${overs}.${ballsInOver}`;
    bowler.economy = bowler.legalDeliveries > 0 ? (bowler.runs / (bowler.legalDeliveries / 6)) : 0;
    // Remove legalDeliveries as it's not needed in final stats
    delete bowler.legalDeliveries;
  });

  // Calculate current player stats for live display
  let strikerRuns = 0, strikerBalls = 0;
  let nonStrikerRuns = 0, nonStrikerBalls = 0;
  let bowlerOvers = "0.0", bowlerRuns = 0, bowlerWickets = 0;

  // Current striker stats
  if (innings.striker) {
    const strikerId = innings.striker.toString();
    if (batterStats[strikerId]) {
      strikerRuns = batterStats[strikerId].runs;
      strikerBalls = batterStats[strikerId].balls;
    }
  }

  // Current non-striker stats
  if (innings.nonStriker) {
    const nonStrikerId = innings.nonStriker.toString();
    if (batterStats[nonStrikerId]) {
      nonStrikerRuns = batterStats[nonStrikerId].runs;
      nonStrikerBalls = batterStats[nonStrikerId].balls;
    }
  }

  // Current bowler stats
  if (innings.currentBowler) {
    const bowlerId = innings.currentBowler.toString();
    if (bowlerStats[bowlerId]) {
      bowlerOvers = bowlerStats[bowlerId].overs;
      bowlerRuns = bowlerStats[bowlerId].runs;
      bowlerWickets = bowlerStats[bowlerId].wickets;
    }
  }

  // Update innings with calculated stats
  innings.batterStats = Object.values(batterStats);
  innings.bowlerStats = Object.values(bowlerStats);
  innings.strikerRuns = strikerRuns;
  innings.strikerBalls = strikerBalls;
  innings.nonStrikerRuns = nonStrikerRuns;
  innings.nonStrikerBalls = nonStrikerBalls;
  innings.bowlerOvers = bowlerOvers;
  innings.bowlerRuns = bowlerRuns;
  innings.bowlerWickets = bowlerWickets;

  return innings;
};

/* ===================== COMMENTARY ===================== */
const buildCommentary = (ball, overNo, ballNo) => {
  if (ball.isWicket) return `WICKET! (${overNo}.${ballNo})`;
  if (ball.extraType !== "none")
    return `${ball.extraType.toUpperCase()} (${overNo}.${ballNo})`;
  if (ball.runs === 6) return `SIX! (${overNo}.${ballNo})`;
  if (ball.runs === 4) return `FOUR! (${overNo}.${ballNo})`;
  if (ball.runs > 0) return `${ball.runs} run(s)`;
  return `Dot ball (${overNo}.${ballNo})`;
};

/* =====================================================
   MAIN SCORING ENGINE
===================================================== */
exports.processBall = async (ball) => {
  const io = getIO();

  const innings = await Innings.findById(ball.inningsId);
  const match = await Match.findById(ball.matchId);
  const over = await Over.findById(ball.overId);

  if (!innings || !match || !over) return;

  /* ---------- LEGAL / ILLEGAL ---------- */
  ball.isLegalDelivery = isLegalDelivery(ball.extraType);

  /* ---------- RUNS ---------- */
  const runsScored = ball.runs + extraRuns(ball.extraType, ball.runs);
  innings.totalRuns += runsScored;

  /* ---------- WICKET ---------- */
  if (ball.isWicket) {
    innings.totalWickets += 1;

    // Track fall of wickets
    const wicketEntry = {
      wicketNumber: innings.totalWickets,
      playerId: ball.dismissedBatsman || ball.striker,
      scoreAtFall: innings.totalRuns,
      overAtFall: innings.totalOvers,
      bowlerId: ball.bowler
    };

    // Add fielderId if wicket type requires it (caught, runout, stumped)
    if (["caught", "runout", "stumped"].includes(ball.wicketType)) {
      wicketEntry.fielderId = ball.fielder;
    }

    innings.fallOfWickets.push(wicketEntry);
  }

  /* ---------- BALL NUMBER ---------- */
  const legalBalls = await Ball.countDocuments({
    overId: over._id,
    isLegalDelivery: true
  });

  ball.ballNumber = ball.isLegalDelivery ? legalBalls + 1 : legalBalls;
  await ball.save();

  over.balls.push(ball._id);
  await over.save();

  /* ---------- OVERS ---------- */
  let [o, b] = innings.totalOvers.split(".").map(Number);

  if (ball.isLegalDelivery) {
    b++;
    if (b === 6) {
      o++;
      b = 0;
    }
  }

  innings.totalOvers = `${o}.${b}`;

  /* ---------- STRIKE ROTATION ---------- */
  if (ball.isLegalDelivery && !ball.isWicket && ball.runs % 2 === 1) {
    rotateStrike(innings);
  }

  /* ---------- OVER COMPLETE ---------- */
  if (ball.isLegalDelivery && b === 0) {
    rotateStrike(innings);

    innings.currentBowler = null;
    innings.currentOverId = null;

    if (io) {
      io.to(`match_${match._id}`).emit("overComplete", {
        completedOver: o
      });
    }
  }

  /* ---------- WICKET FLOW ---------- */
  if (ball.isWicket) {
    if (io) {
      io.to(`match_${match._id}`).emit("newBatterNeeded", {
        which: "striker"
      });
    }
  }

  /* ---------- INNINGS COMPLETE ---------- */
  if (innings.totalWickets === 10 || o >= match.overs) {
    innings.completed = true;

    // Set target for second innings if this is the first innings
    if (innings.inningsNumber === 1) {
      match.target = innings.totalRuns + 1;
      await match.save();
    }

    if (io) {
      io.to(`match_${match._id}`).emit("inningsComplete", {
        runs: innings.totalRuns,
        wickets: innings.totalWickets,
        inningsNumber: innings.inningsNumber
      });
    }
  }

  // Calculate player stats before saving
  await calculatePlayerStats(innings);
  await innings.save();

  /* ---------- UPDATE MATCH CURRENT SCORE ---------- */
  match.currentScore.runs = innings.totalRuns;
  match.currentScore.wickets = innings.totalWickets;
  match.currentScore.overs = innings.totalOvers;
  await match.save();

  /* ---------- LIVE SCORE ---------- */
  // Populate player data for live score update
  const populatedInnings = await Innings.findById(innings._id)
    .populate("battingTeam", "name")
    .populate("bowlingTeam", "name")
    .populate("striker", "name")
    .populate("nonStriker", "name")
    .populate("currentBowler", "name")
    .populate("fallOfWickets.playerId", "name")
    .populate("fallOfWickets.bowlerId", "name")
    .populate("fallOfWickets.fielderId", "name");

  if (io) {
    io.to(`match_${match._id}`).emit("liveScoreUpdate", {
      runs: populatedInnings.totalRuns,
      wickets: populatedInnings.totalWickets,
      overs: populatedInnings.totalOvers,
      battingTeam: populatedInnings.battingTeam,
      bowlingTeam: populatedInnings.bowlingTeam,
      striker: populatedInnings.striker,
      nonStriker: populatedInnings.nonStriker,
      currentBowler: populatedInnings.currentBowler,
      fallOfWickets: populatedInnings.fallOfWickets,
      strikerRuns: populatedInnings.strikerRuns,
      strikerBalls: populatedInnings.strikerBalls,
      nonStrikerRuns: populatedInnings.nonStrikerRuns,
      nonStrikerBalls: populatedInnings.nonStrikerBalls,
      bowlerOvers: populatedInnings.bowlerOvers,
      bowlerRuns: populatedInnings.bowlerRuns,
      bowlerWickets: populatedInnings.bowlerWickets,
      inningsNumber: populatedInnings.inningsNumber
    });
  }

  /* ---------- BALL REMOVED EVENT ---------- */
  // Emit ball removed event for viewers to update active over and balls
  if (io) {
    io.to(`match_${match._id}`).emit("ballRemoved", {
      overId: over._id
    });
  }

  /* ---------- BALL ADDED EVENT ---------- */
  // Emit ball added event for viewers to update active over and balls
  const populatedBall = await Ball.findById(ball._id).populate("bowler", "name");
  const ballAddedData = {
    ball: populatedBall,
    overId: over._id,
    overNumber: over.overNumber,
    bowler: populatedBall.bowler
  };
  if (io) {
    io.to(`match_${match._id}`).emit("ballAdded", ballAddedData);
    console.log(`🎾 Ball added event emitted to match_${match._id}:`, ballAddedData);
  }

  /* ---------- COMMENTARY ---------- */
  const commentaryData = {
    text: buildCommentary(ball, o, b),
    type: ball.isWicket ? "WICKET" : ball.runs === 6 ? "SIX" : ball.runs === 4 ? "FOUR" : ball.extraType !== "none" ? "EXTRA" : ball.runs > 0 ? "NORMAL" : "INFO",
    createdAt: new Date()
  };
  if (io) {
    io.to(`match_${match._id}`).emit("newCommentary", commentaryData);
    console.log(`💬 Commentary emitted to match_${match._id}:`, commentaryData);
  }
};

exports.calculatePlayerStats = calculatePlayerStats;

/* =====================================================
   REVERSE BALL PROCESSING (FOR UNDO)
===================================================== */
exports.reverseProcessBall = async (ball) => {
  const io = getIO();

  const innings = await Innings.findById(ball.inningsId);
  const match = await Match.findById(ball.matchId);
  const over = await Over.findById(ball.overId);

  if (!innings || !match || !over) return;

  /* ---------- LEGAL / ILLEGAL ---------- */
  ball.isLegalDelivery = isLegalDelivery(ball.extraType);

  /* ---------- RUNS ---------- */
  const runsScored = ball.runs + extraRuns(ball.extraType, ball.runs);
  innings.totalRuns -= runsScored;

  /* ---------- WICKET ---------- */
  if (ball.isWicket) {
    innings.totalWickets -= 1;
    // Remove the last fall of wicket entry
    innings.fallOfWickets.pop();
  }

  /* ---------- OVERS ---------- */
  let [o, b] = innings.totalOvers.split(".").map(Number);

  if (ball.isLegalDelivery) {
    b--;
    if (b < 0) {
      o--;
      b = 5; // Reset to 5 balls (since 6 balls per over, after decrementing from 0)
    }
  }

  innings.totalOvers = `${o}.${b}`;

  /* ---------- STRIKE ROTATION ---------- */
  // Reverse strike rotation if it happened
  if (ball.isLegalDelivery && !ball.isWicket && ball.runs % 2 === 1) {
    rotateStrike(innings);
  }

  /* ---------- OVER COMPLETE ---------- */
  // If this was the ball that completed the over, reverse it
  if (ball.isLegalDelivery && b === 5) { // If after reversal b=5, it means over was completed
    // Set back to previous over state
    innings.currentBowler = innings.currentBowler; // Keep current bowler
    innings.currentOverId = over._id; // Keep current over
  }

  /* ---------- REMOVE BALL FROM OVER ---------- */
  over.balls = over.balls.filter(ballId => !ballId.equals(ball._id));
  await over.save();

  /* ---------- INNINGS COMPLETE ---------- */
  // If innings was completed due to this ball, reverse it
  if (innings.totalWickets < 10 && o < match.overs) {
    innings.completed = false;

    // Clear target if this was the first innings being reversed
    if (innings.inningsNumber === 1) {
      match.target = null;
      await match.save();
    }
  }

  // Calculate player stats before saving
  await calculatePlayerStats(innings);
  await innings.save();

  /* ---------- UPDATE MATCH CURRENT SCORE ---------- */
  match.currentScore.runs = innings.totalRuns;
  match.currentScore.wickets = innings.totalWickets;
  match.currentScore.overs = innings.totalOvers;
  await match.save();

  /* ---------- LIVE SCORE ---------- */
  // Populate player data for live score update
  const populatedInnings = await Innings.findById(innings._id)
    .populate("battingTeam", "name")
    .populate("bowlingTeam", "name")
    .populate("striker", "name")
    .populate("nonStriker", "name")
    .populate("currentBowler", "name")
    .populate("fallOfWickets.playerId", "name")
    .populate("fallOfWickets.bowlerId", "name")
    .populate("fallOfWickets.fielderId", "name");

  if (io) {
    io.to(`match_${match._id}`).emit("liveScoreUpdate", {
      runs: populatedInnings.totalRuns,
      wickets: populatedInnings.totalWickets,
      overs: populatedInnings.totalOvers,
      battingTeam: populatedInnings.battingTeam,
      bowlingTeam: populatedInnings.bowlingTeam,
      striker: populatedInnings.striker,
      nonStriker: populatedInnings.nonStriker,
      currentBowler: populatedInnings.currentBowler,
      fallOfWickets: populatedInnings.fallOfWickets,
      strikerRuns: populatedInnings.strikerRuns,
      strikerBalls: populatedInnings.strikerBalls,
      nonStrikerRuns: populatedInnings.nonStrikerRuns,
      nonStrikerBalls: populatedInnings.nonStrikerBalls,
      bowlerOvers: populatedInnings.bowlerOvers,
      bowlerRuns: populatedInnings.bowlerRuns,
      bowlerWickets: populatedInnings.bowlerWickets,
      inningsNumber: populatedInnings.inningsNumber
    });
  }
};
