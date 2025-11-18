const ScoreEvent = require("../models/ScoreEvent");


// Create a new score event (run, wicket, wide, commentary, etc.)
exports.createScoreEvent = async (req, res) => {
  try {
    const event = new ScoreEvent(req.body);
    await event.save();

    res.status(201).json({
      message: "Score event recorded",
      event,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// Get all events for an innings
exports.getEventsByInnings = async (req, res) => {
  try {
    const { inningsId } = req.params;

    const events = await ScoreEvent.find({ inningsId })
      .sort({ createdAt: 1 }) // in order
      .populate("dismissedPlayer fielder");

    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// Live commentary — last 20 events
exports.getLiveCommentary = async (req, res) => {
  try {
    const { matchId } = req.params;

    const commentary = await ScoreEvent.find({ matchId })
      .sort({ createdAt: -1 })
      .limit(20);

    res.status(200).json(commentary.reverse()); 
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
