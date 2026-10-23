const mongoose = require("mongoose");
// per90 holds the rates the pricing model uses, keyed by stat family.
const S = new mongoose.Schema(
  {
    name: { type: String, required: true },
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true },
    position: String,
    externalId: String,
    imageUrl: String, // optional; the frontend falls back to a generated avatar
    per90: { type: Map, of: Number, default: {} },
    minutesSample: { type: Number, default: 0 },
    expectedMinutes: { type: Number, default: 80 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true, versionKey: false }
);
module.exports = mongoose.models.Player || mongoose.model("Player", S);
