const Innings = require("../models/Innings");

exports.createInnings = async (req, res) => {
  try {
    const innings = new Innings(req.body);
    await innings.save();
    res.status(201).json({ message: "Innings created", innings });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
