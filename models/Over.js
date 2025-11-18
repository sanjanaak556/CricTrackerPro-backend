const mongoose = require("mongoose");
const overSchema = new mongoose.Schema({
    inningsId: { type: mongoose.Schema.Types.ObjectId, ref: "Innings", required: true },
    overNumber: { type: Number, required: true },
    bowler: { type: mongoose.Schema.Types.ObjectId, ref: "Player", required: true }
});
overSchema.index({ inningsId: 1 });
module.exports = mongoose.model("Over", overSchema);

