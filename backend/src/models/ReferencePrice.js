const mongoose = require("mongoose");
// Calibration only; never used for pricing.
const S = new mongoose.Schema(
  {
    marketId: { type: mongoose.Schema.Types.ObjectId, ref: "Market", required: true, index: true },
    source: { type: String, enum: ["betfair", "oddsapi"], required: true },
    pYes: { type: Number, required: true }, // de-vigged
    raw: {},
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false }
);
module.exports = mongoose.models.ReferencePrice || mongoose.model("ReferencePrice", S);
