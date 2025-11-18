const Over = require("../models/Over");

exports.createOver = async (req, res) => {
  try {
    const over = new Over(req.body);
    await over.save();
    res.status(201).json({ message: "Over created", over });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
