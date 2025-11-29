const mongoose = require("mongoose");

const overSchema = new mongoose.Schema({
    matchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Match",
        required: true
    },
    
    inningsId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Innings",
        required: true
    },

    overNumber: {
        type: Number,
        required: true
    },

    bowler: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Player",
        required: true
    },

    balls: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Ball"
        }
    ]
},
    { timestamps: true }
);

overSchema.index({ matchId: 1 });
overSchema.index({ inningsId: 1 });
overSchema.index({ inningsId: 1, overNumber: 1 }, { unique: true });

module.exports = mongoose.model("Over", overSchema);


