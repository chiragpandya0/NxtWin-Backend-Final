const mongoose = require("mongoose");
const Leg = new mongoose.Schema(
  {
    marketId: { type: mongoose.Schema.Types.ObjectId, ref: "Market", required: true },
    fixtureId: { type: mongoose.Schema.Types.ObjectId, required: true },
    side: { type: String, enum: ["yes", "no"], required: true },
    lockedP: { type: Number, required: true },
    result: { type: String, enum: ["pending", "won", "lost", "void"], default: "pending" },
  },
  { _id: false }
);
const S = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    legs: { type: [Leg], validate: (v) => v.length >= 2 && v.length <= 6 },
    stakePence: { type: Number, required: true }, // debited from the user, fee included
    feePence: { type: Number, required: true },
    payoutPence: { type: Number, required: true }, // locked at placement
    status: { type: String, enum: ["open", "won", "lost", "void", "sold"], default: "open", index: true },
    settledPayoutPence: { type: Number, default: 0 },
    settlementVersion: { type: Number, default: 0 },
    firstKickoff: { type: Date, required: true },
    gameweek: { type: Number, required: true },
  },
  { timestamps: true, versionKey: false }
);
module.exports = mongoose.models.Accumulator || mongoose.model("Accumulator", S);
