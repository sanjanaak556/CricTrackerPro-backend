const Commentary = require("../models/Commentary");

exports.addCommentary = async (req, res) => {
    try {
        const { matchId, inningsId, text } = req.body;
        if (!matchId || !text) return res.status(400).json({ message: "Missing fields" });
        const c = new Commentary({ matchId, inningsId, text });
        await c.save();
        res.status(201).json({ message: "Commentary added", commentary: c });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getCommentary = async (req, res) => {
    try {
        const { matchId } = req.params;
        const items = await Commentary.find({ matchId }).sort({ createdAt: 1 });
        res.json(items);
    } catch (err) { res.status(500).json({ error: err.message }); }
};
