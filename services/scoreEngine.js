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
      return 1;
    case "bye":
    case "legbye":
      return runs;
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
  let type = "RUN";

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

    /* ---------------------------
       PRE-VALIDATION: prevent consecutive-over bowler
       (must run BEFORE we save the ball into the over)
       - If this is the first ball of an over (over.balls.length === 0)
       - AND innings.lastOverBowler equals current ball's bowler
         -> reject and emit bowlerNotAllowed
    ---------------------------- */
    if (
      innings.lastOverBowler &&
      over.balls.length === 0 && // first ball of the over
      innings.lastOverBowler.toString() === ball.bowler.toString()
    ) {
      io.to(`match_${matchId}`).emit("bowlerNotAllowed", {
        reason: "consecutive_over",
        message: "Bowler cannot bowl consecutive overs. Please select another bowler.",
      });
      return; // do not process this ball
    }

    /* 1️⃣ CALCULATE RUNS AND EXTRAS */
    const extraRuns = getExtraRuns(ball.extraType, ball.runs);
    const totalRuns = ball.runs + extraRuns;
    innings.totalRuns += totalRuns;

    if (ball.isWicket) innings.totalWickets += 1;

    // Add ball to over (moved AFTER pre-validation)
    over.balls.push(ball._id);
    await over.save();

    /* 2️⃣ LEGAL BALL & BALL NUMBER UPDATE */
    let legal = isLegal(ball.extraType);
    // Defensive parsing: ensure we get valid numbers even if totalOvers is malformed
    let [currentOver, currentBall] = [0,0];
    try {
      const parts = String(innings.totalOvers || "0.0").split(".").map(Number);
      currentOver = Number.isFinite(parts[0]) ? parts[0] : 0;
      currentBall = Number.isFinite(parts[1]) ? parts[1] : 0;
    } catch (e) {
      currentOver = 0;
      currentBall = 0;
    }

    if (legal) {
      currentBall += 1;
      if (currentBall === 6) {
        currentOver += 1;
        currentBall = 0;
      }
    }

    innings.totalOvers = `${currentOver}.${currentBall}`;

    /* 3️⃣ STRIKE ROTATION & WICKET EMIT */
    let striker = innings.striker;
    let nonStriker = innings.nonStriker;

    if (legal && !ball.isWicket && ball.runs % 2 === 1) {
      [striker, nonStriker] = [nonStriker, striker];
    }

    if (ball.isWicket) {
      striker = innings.striker; // keep current until new batter chosen

      io.to(`match_${matchId}`).emit("newBatterNeeded", {
        which: "striker",
        message: "Select new batsman (striker)."
      });
    }

    innings.striker = striker;
    innings.nonStriker = nonStriker;

    /* 4️⃣ OVER COMPLETION & AUTO-CREATE NEXT OVER */
    const overCompleted = legal && currentBall === 0 && over.balls.length === 6;

    if (overCompleted) {
      io.to(`match_${matchId}`).emit("overComplete", {
        overNumber: currentOver - 1,
        message: `Over ${currentOver - 1} completed`,
      });

      ensureBowlerStats(innings);
      const finishedBowler = over.bowler || innings.currentBowler;
      if (finishedBowler) {
        innings.bowlerOvers[finishedBowler] =
          (innings.bowlerOvers[finishedBowler] || 0) + 1;
        // update lastOverBowler so next over validation works
        innings.lastOverBowler = finishedBowler;
      }

      // Prepare to auto-start next over only if a valid currentBowler is set and allowed
      const maxPerBowler = getMaxOversPerBowler(match);
      const chosenBowler = innings.currentBowler;

      // Swap striker/nonStriker first
      [innings.striker, innings.nonStriker] = [innings.nonStriker, innings.striker];
      // Record the swap was applied for this completed over
      try {
        innings.lastSwapOverNumber = currentOver - 1;
      } catch (e) {
        /* ignore */
      }

      // If no bowler chosen, prompt UI to select one
      if (!chosenBowler) {
        innings.currentOverId = null;
        innings.currentBowler = null;
        io.to(`match_${matchId}`).emit("chooseBowler", {
          reason: "no_bowler",
          message: "Select a bowler to start the next over."
        });
      } else {
        const used = innings.bowlerOvers[chosenBowler] || 0;

        // If chosen bowler has exceeded quota, prompt change
        if (used >= maxPerBowler) {
          innings.currentBowler = null;
          innings.currentOverId = null;
          io.to(`match_${matchId}`).emit("bowlerNotAllowed", {
            reason: "max_overs_reached",
            message: `This bowler has already bowled ${used} overs (max ${maxPerBowler}). Choose a different bowler.`,
            over: currentOver,
          });

          io.to(`match_${matchId}`).emit("chooseBowler", {
            reason: "max_overs_reached",
            message: "Select a different bowler.",
          });
        }

        // If chosen bowler would be bowling consecutive overs, prompt change
        else if (innings.lastOverBowler && innings.lastOverBowler.toString() === chosenBowler.toString()) {
          innings.currentBowler = null;
          innings.currentOverId = null;
          io.to(`match_${matchId}`).emit("bowlerNotAllowed", {
            reason: "consecutive_over",
            message: "Bowler cannot bowl consecutive overs. Please select another bowler.",
          });

          io.to(`match_${matchId}`).emit("chooseBowler", {
            reason: "consecutive_over",
            message: "Select a different bowler for the next over.",
          });
        } else {
          // All good — create next over automatically
          const newOver = await Over.create({
            matchId,
            inningsId,
            overNumber: currentOver,
            bowler: chosenBowler,
            balls: [],
          });

          innings.currentOverId = newOver._id;
        }
      }
    }

    /* 5️⃣ CHECK INNINGS COMPLETION */
    const maxOvers = match.overs;
    const allOut = innings.totalWickets >= 10;
    const oversFinished = currentOver >= maxOvers;

    if (allOut || oversFinished) {
      // Log details to aid debugging if unexpected completion occurs
      console.log("⚠️ Innings completion check:", {
        inningsId,
        allOut,
        oversFinished,
        inningsTotalOvers: innings.totalOvers,
        inningsTotalWickets: innings.totalWickets,
        matchOvers: match.overs,
        currentOver,
        currentBall,
        inningsCompletedBefore: innings.completed,
      });

      // Only mark and emit completed if it wasn't already completed
      if (!innings.completed) {
        innings.completed = true;

        io.to(`match_${matchId}`).emit("inningsComplete", {
          inningsId,
          runs: innings.totalRuns,
          wickets: innings.totalWickets,
        });

        if (match.currentInnings === 1) match.currentInnings = 2;
        else match.isCompleted = true;

        await match.save();
      } else {
        console.log("⚠️ Innings was already marked completed — skipping emit.");
      }
    }

    await innings.save();

    /* 6️⃣ EMIT LIVE SCORE */
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

    /* 7️⃣ COMMENTARY & EVENT EMITS WITH SCORER TEXT */
    let { text: commentaryText, type: eventType } = generateCommentary(
      ball,
      innings,
      currentOver,
      currentBall
    );

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

/* ---------------------
  BOWLER UTILS (safe, minimal)
--------------------- */
function getMaxOversPerBowler(match) {
  return Math.floor(match.overs / 5);
}

function ensureBowlerStats(innings) {
  innings.bowlerOvers = innings.bowlerOvers || {};
}

module.exports = { processBall };
