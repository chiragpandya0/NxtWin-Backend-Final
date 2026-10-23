const mongoose = require("mongoose");
const S = new mongoose.Schema(
  {
    marketId: { type: mongoose.Schema.Types.ObjectId, ref: "Market", required: true },
    pYes: { type: Number, required: true },
    q: { yes: Number, no: Number },
    reason: { type: String, enum: ["open", "trade", "ladder_adjust", "admin"], default: "trade" },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false }
);
S.index({ marketId: 1, createdAt: 1 });
module.exports = mongoose.models.PriceSnapshot || mongoose.model("PriceSnapshot", S);
