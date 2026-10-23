const mongoose = require("mongoose");
const S = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    marketId: { type: mongoose.Schema.Types.ObjectId, ref: "Market", required: true, index: true },
    side: { type: String, enum: ["yes", "no"], required: true },
    action: { type: String, enum: ["buy", "sell"], required: true },
    shares: { type: Number, required: true },
    grossPence: { type: Number, required: true }, // before fee
    feePence: { type: Number, required: true },
    netPence: { type: Number, required: true }, // what moved on the user's balance (always positive)
    avgPrice: Number,
    priceBefore: Number,
    priceAfter: Number,
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false }
);
module.exports = mongoose.models.Trade || mongoose.model("Trade", S);
