const Over = require("../models/Over");
const Innings = require("../models/Innings");
const Player = require("../models/Player");

exports.createOver = async (req, res) => {
  try {
    const { inningsId, bowler, matchId } = req.body;

    // Validate innings
    const innings = await Innings.findById(inningsId);
    if (!innings) {
      return res.status(404).json({ error: "Innings not found" });
    }

    // Prevent creating a new over if there's an active over that is not complete
    if (innings.currentOverId) {
      const active = await Over.findById(innings.currentOverId).populate('balls');
      const legalCount = active.balls.filter(b => b.isLegalDelivery).length;
      if (legalCount < 6) {
        return res.status(400).json({ error: 'Current over still active. Finish it before creating a new over.' });
      }
    }

    // Validate bowler
    const bowlerPlayer = await Player.findById(bowler);
    if (!bowlerPlayer) {
      return res.status(404).json({ error: "Bowler not found" });
    }

    // Ensure bowler is not the same as last over's bowler
    const lastOver = await Over.find({ inningsId })
      .sort({ overNumber: -1 })
      .limit(1);

    if (lastOver.length > 0) {
      const lastBowler = lastOver[0].bowler?.toString();
      if (lastBowler && lastBowler === bowler.toString()) {
        return res.status(400).json({ error: 'Bowler cannot bowl consecutive overs.' });
      }
    }

    const lastOverNumber = lastOver.length > 0 ? lastOver[0].overNumber : 0;
    const nextOverNumber = lastOverNumber > 0 ? lastOverNumber + 1 : 1;

    // If the striker swap for the last completed over hasn't been applied, do it now
    if (lastOverNumber > 0 && (typeof innings.lastSwapOverNumber !== 'number' || innings.lastSwapOverNumber !== lastOverNumber)) {
      [innings.striker, innings.nonStriker] = [innings.nonStriker, innings.striker];
      innings.lastSwapOverNumber = lastOverNumber;
      await innings.save();
    }

    // Create new Over
    const newOver = await Over.create({
      matchId,
      inningsId,
      overNumber: nextOverNumber,
      bowler,
      balls: []
    });

    //  UPDATE ACTIVE OVER and set currentBowler
    innings.currentOverId = newOver._id;
    innings.currentBowler = bowler;
    await innings.save();

    return res.status(201).json({
      message: "Over created successfully",
      over: newOver
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};


//2. Get all overs of a specific innings
exports.getOversByInnings = async (req, res) => {
  try {
    const { inningsId } = req.params;

    const overs = await Over.find({ inningsId })
      .populate("bowler", "name")
      .populate({
        path: "balls",
        populate: [
          { path: "striker", select: "name" },
          { path: "nonStriker", select: "name" },
          { path: "bowler", select: "name" }
        ]
      })
      .sort({ overNumber: 1 });

    return res.status(200).json({ overs });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

//3. Get single over
exports.getSingleOver = async (req, res) => {
  try {
    const { id } = req.params;

    const over = await Over.findById(id)
      .populate("bowler", "name")
      .populate({
        path: "balls",
        populate: [
          { path: "striker", select: "name" },
          { path: "nonStriker", select: "name" },
          { path: "bowler", select: "name" }
        ]
      });

    if (!over) {
      return res.status(404).json({ error: "Over not found" });
    }

    return res.status(200).json({ over });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// 4. START FIRST OVER
exports.startOver = async (req, res) => {
  try {
    const { inningsId, bowler } = req.body;

    const innings = await Innings.findById(inningsId);
    if (!innings) return res.status(404).json({ error: "Innings not found" });

    // If there's an active over, ensure it is complete
    if (innings.currentOverId) {
      const active = await Over.findById(innings.currentOverId).populate('balls');
      const legalCount = active.balls.filter(b => b.isLegalDelivery).length;
      if (legalCount < 6) {
        return res.status(400).json({ error: 'Current over still active. Finish it before starting a new over.' });
      }
    }

    // Prevent consecutive over bowler
    const lastOver = await Over.find({ inningsId })
      .sort({ overNumber: -1 })
      .limit(1);

    if (lastOver.length > 0) {
      const lastBowler = lastOver[0].bowler?.toString();
      if (lastBowler && lastBowler === bowler.toString()) {
        return res.status(400).json({ error: 'Bowler cannot bowl consecutive overs.' });
      }
    }

    const existingOvers = await Over.find({ inningsId });
    const lastOverNumber = existingOvers.length; // number of completed overs
    const overNumber = lastOverNumber + 1; // next over number

    // If striker swap for last completed over hasn't been applied yet, apply it
    if (lastOverNumber > 0 && (typeof innings.lastSwapOverNumber !== 'number' || innings.lastSwapOverNumber !== lastOverNumber)) {
      [innings.striker, innings.nonStriker] = [innings.nonStriker, innings.striker];
      innings.lastSwapOverNumber = lastOverNumber;
      await innings.save();
    }

    const newOver = await Over.create({
      matchId: innings.matchId,
      inningsId,
      overNumber,
      bowler,
      balls: []
    });

    innings.currentOverId = newOver._id;
    innings.currentBowler = bowler;
    await innings.save();

    return res.status(201).json({
      message: "Over started",
      over: newOver
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 5. GET ACTIVE OVER
exports.getActiveOver = async (req, res) => {
  try {
    const { inningsId } = req.params;

    const innings = await Innings.findById(inningsId);
    if (!innings) {
      return res.status(404).json({ error: "Innings not found" });
    }

    if (!innings.currentOverId) {
      return res.json({ activeOver: null, legalBalls: 0 });
    }

    const over = await Over.findById(innings.currentOverId)
      .populate('bowler', 'name')
      .populate({
        path: 'balls',
        populate: [
          { path: 'striker', select: 'name' },
          { path: 'nonStriker', select: 'name' },
          { path: 'bowler', select: 'name' }
        ]
      });

    const legalBalls = over.balls.filter(b => b.isLegalDelivery).length;

    return res.json({ activeOver: over, legalBalls });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};




