// services/scoreEngine.js

const Match = require("../models/Match");
const Innings = require("../models/Innings");
const Over = require("../models/Over");
const Ball = require("../models/Ball");

const { getIO } = require("./socket");

/* -----------------------------------------------------
   UTILITY: EXTRAS CONVERSION
----------------------------------------------------- */
function getExtraRuns(extraType, runs) {
  switch (extraType) {
    case "wide":
    case "noball":
      return 1; // Extra run for wide/no-ball
    case "bye":
    case "legbye":
      return runs; // Counted as extras
    default:
      return 0;
  }
}

function isLegal(extraType) {
  return !(extraType === "wide" || extraType === "noball");
}

/* --------------------------------------------------
   HELPER: GENERATE DESCRIPTIVE COMMENTARY
----------------------------------------------------- */
function generateCommentary(ball, innings, currentOver, currentBall) {
  let text = "";
  let type = "RUN"; // default event type

  const striker = innings.striker;
  const bowler = ball.bowler;

  if (ball.isWicket) {
    text = `${striker} is OUT! Bowled by ${bowler}.`;
    type = "WICKET";
  } else if (ball.extraType === "wide") {
    text = `Wide ball by ${bowler}. +1 extra run`;
    type = "EXTRA";
  } else if (ball.extraType === "noball") {
    text = `No-ball by ${bowler}. +1 extra run`;
    type = "EXTRA";
  } else if (ball.extraType === "bye" || ball.extraType === "legbye") {
    text = `${ball.runs} ${ball.extraType} run${ball.runs > 1 ? "s" : ""} taken`;
    type = "EXTRA";
  } else if (ball.runs === 6) {
    text = `${striker} hits a SIX off ${bowler}!`;
    type = "SIX";
  } else if (ball.runs === 4) {
    text = `${striker} hits a FOUR off ${bowler}!`;
    type = "FOUR";
  } else if (ball.runs > 0) {
    text = `${striker} scores ${ball.runs} run${ball.runs > 1 ? "s" : ""} off ${bowler}`;
    type = "RUN";
  } else {
    text = `Dot ball by ${bowler}`;
    type = "DOT";
  }

  // Include current over and ball number
  text += ` (Over ${currentOver}.${currentBall})`;

  return { text, type };
}

/* -----------------------------------------------------
   MAIN SCORE ENGINE — RUN AFTER EVERY BALL SAVED
----------------------------------------------------- */
async function processBall(ball) {
  try {
    const io = getIO();
    const { matchId, inningsId, overId } = ball;

    // basic validation: these must exist
    if (!matchId || !inningsId || !overId) {
      console.warn("processBall missing match/innings/over id, skipping:", { matchId, inningsId, overId });
      return;
    }

    // make sure runs is a number
    ball.runs = typeof ball.runs === "number" ? ball.runs : 0;

    const match = await Match.findById(matchId);
    const innings = await Innings.findById(inningsId);
    let over = await Over.findById(overId);

    if (!match || !innings || !over) {
      console.log("❌ Missing match/innings/over");
      return;
    }

    /* -----------------------------------------------------
       1️⃣ CALCULATE RUNS AND EXTRAS
    ----------------------------------------------------- */
    const extraRuns = getExtraRuns(ball.extraType, ball.runs);
    const totalRuns = ball.runs + extraRuns;
    innings.totalRuns += totalRuns;

    if (ball.isWicket) innings.totalWickets += 1;

    // Add ball to over
    over.balls.push(ball._id);
    await over.save();

    /* -----------------------------------------------------
       2️⃣ LEGAL BALL & BALL NUMBER UPDATE
    ----------------------------------------------------- */
    let legal = isLegal(ball.extraType);
    let [currentOver, currentBall] = innings.totalOvers
      .split(".")
      .map(Number);

    if (legal) {
      currentBall += 1;
      if (currentBall === 6) {
        currentOver += 1;
        currentBall = 0;
      }
    }

    innings.totalOvers = `${currentOver}.${currentBall}`;

    /* -----------------------------------------------------
       3️⃣ STRIKE ROTATION
    ----------------------------------------------------- */
    let striker = innings.striker;
    let nonStriker = innings.nonStriker;

    // Rotate strike on odd runs (if legal)
    if (legal && !ball.isWicket && ball.runs % 2 === 1) {
      [striker, nonStriker] = [nonStriker, striker];
    }

    // Wicket: striker will be replaced manually on frontend
    if (ball.isWicket) striker = innings.striker;

    innings.striker = striker;
    innings.nonStriker = nonStriker;

    /* -----------------------------------------------------
       4️⃣ OVER COMPLETION & AUTO-CREATE NEXT OVER
    ----------------------------------------------------- */
    const overCompleted = legal && currentBall === 0 && over.balls.length === 6;

    if (overCompleted) {
      io.to(`match_${matchId}`).emit("overComplete", {
        overNumber: currentOver - 1,
        message: `Over ${currentOver - 1} completed`,
      });

      // Create next over safely
      const newOver = await Over.create({
        matchId,
        inningsId,
        overNumber: currentOver,
        bowler: innings.currentBowler,
        balls: [],
      });

      innings.currentOverId = newOver._id;

      // Rotate strike at end of over
      [innings.striker, innings.nonStriker] = [innings.nonStriker, innings.striker];
    }

    /* -----------------------------------------------------
       5️⃣ CHECK INNINGS COMPLETION
    ----------------------------------------------------- */
    const maxOvers = match.overs;
    const allOut = innings.totalWickets >= 10;
    const oversFinished = currentOver >= maxOvers;

    if (allOut || oversFinished) {
      innings.completed = true;

      io.to(`match_${matchId}`).emit("inningsComplete", {
        inningsId,
        runs: innings.totalRuns,
        wickets: innings.totalWickets,
      });

      if (match.currentInnings === 1) match.currentInnings = 2;
      else match.isCompleted = true;

      await match.save();
    }

    await innings.save();

    /* -----------------------------------------------------
       6️⃣ EMIT LIVE SCORE
    ----------------------------------------------------- */
    io.to(`match_${matchId}`).emit("liveScoreUpdate", {
      matchId,
      inningsId,
      runs: innings.totalRuns,
      wickets: innings.totalWickets,
      overs: innings.totalOvers,
      striker,
      nonStriker,
      lastBall: {
        runs: ball.runs,
        extraType: ball.extraType,
        isWicket: ball.isWicket,
        bowler: ball.bowler,
      },
    });

    /* -----------------------------------------------------
       7️⃣ COMMENTARY & EVENT EMITS WITH SCORER TEXT
    ----------------------------------------------------- */
    let { text: commentaryText, type: eventType } = generateCommentary(
      ball,
      innings,
      currentOver,
      currentBall
    );

    // Append scorer's custom commentary if provided
    if (ball.customCommentary && ball.customCommentary.trim() !== "") {
      commentaryText = `${ball.customCommentary} — ${commentaryText}`;
    }

    io.to(`match_${matchId}`).emit("newCommentary", {
      text: commentaryText,
      over: innings.totalOvers,
    });

    io.to(`match_${matchId}`).emit("eventReceived", {
      type: eventType,
    });

    console.log("📡 Score Engine processed ball successfully");
  } catch (err) {
    console.log("❌ Score Engine Error:", err);
  }
}

module.exports = { processBall };


