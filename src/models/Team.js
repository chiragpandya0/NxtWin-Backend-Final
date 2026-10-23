const mongoose = require("mongoose");
const S = new mongoose.Schema(
  { name: { type: String, required: true, unique: true }, short: String, externalId: String, attackFactor: { type: Number, default: 1 }, defenceFactor: { type: Number, default: 1 } },
  { timestamps: true, versionKey: false }
);
module.exports = mongoose.models.Team || mongoose.model("Team", S);
