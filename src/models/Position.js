const mongoose = require("mongoose");
const S = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    marketId: { type: mongoose.Schema.Types.ObjectId, ref: "Market", required: true },
    side: { type: String, enum: ["yes", "no"], required: true },
    shares: { type: Number, default: 0 },
    costPence: { type: Number, default: 0 }, // net cash in (buys + fees - sells), for void refunds & P&L
    settled: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false }
);
S.index({ userId: 1, marketId: 1, side: 1 }, { unique: true });
module.exports = mongoose.models.Position || mongoose.model("Position", S);
