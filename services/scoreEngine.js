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

    io.to(`match_${match._id}`).emit("overComplete", {
      completedOver: o
    });
  }

  /* ---------- WICKET FLOW ---------- */
  if (ball.isWicket) {
    io.to(`match_${match._id}`).emit("newBatterNeeded", {
      which: "striker"
    });
  }

  /* ---------- INNINGS COMPLETE ---------- */
  if (innings.totalWickets === 10 || o >= match.overs) {
    innings.completed = true;

    io.to(`match_${match._id}`).emit("inningsComplete", {
      runs: innings.totalRuns,
      wickets: innings.totalWickets
    });
  }

  await innings.save();

  /* ---------- LIVE SCORE ---------- */
  // Populate player data for live score update
  const populatedInnings = await Innings.findById(innings._id)
    .populate("striker", "name")
    .populate("nonStriker", "name")
    .populate("currentBowler", "name")
    .populate("fallOfWickets.playerId", "name")
    .populate("fallOfWickets.bowlerId", "name")
    .populate("fallOfWickets.fielderId", "name");

  io.to(`match_${match._id}`).emit("liveScoreUpdate", {
    runs: populatedInnings.totalRuns,
    wickets: populatedInnings.totalWickets,
    overs: populatedInnings.totalOvers,
    striker: populatedInnings.striker,
    nonStriker: populatedInnings.nonStriker,
    currentBowler: populatedInnings.currentBowler,
    fallOfWickets: populatedInnings.fallOfWickets
  });

  /* ---------- COMMENTARY ---------- */
  io.to(`match_${match._id}`).emit("newCommentary", {
    text: buildCommentary(ball, o, b)
  });
};

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
  }

  await innings.save();

  /* ---------- LIVE SCORE ---------- */
  // Populate player data for live score update
  const populatedInnings = await Innings.findById(innings._id)
    .populate("striker", "name")
    .populate("nonStriker", "name")
    .populate("currentBowler", "name")
    .populate("fallOfWickets.playerId", "name")
    .populate("fallOfWickets.bowlerId", "name")
    .populate("fallOfWickets.fielderId", "name");

  io.to(`match_${match._id}`).emit("liveScoreUpdate", {
    runs: populatedInnings.totalRuns,
    wickets: populatedInnings.totalWickets,
    overs: populatedInnings.totalOvers,
    striker: populatedInnings.striker,
    nonStriker: populatedInnings.nonStriker,
    currentBowler: populatedInnings.currentBowler,
    fallOfWickets: populatedInnings.fallOfWickets
  });
};
