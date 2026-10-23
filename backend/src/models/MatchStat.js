const mongoose = require("mongoose");
// Final stats for one subject (player or team) in one fixture.
const S = new mongoose.Schema(
  {
    fixtureId: { type: mongoose.Schema.Types.ObjectId, ref: "Fixture", required: true },
    subjectType: { type: String, enum: ["player", "team"], required: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, required: true },
    minutes: { type: Number, default: 0 },
    stats: { type: Map, of: Number, default: {} },
  },
  { timestamps: true, versionKey: false }
);
S.index({ fixtureId: 1, subjectType: 1, subjectId: 1 }, { unique: true });
module.exports = mongoose.models.MatchStat || mongoose.model("MatchStat", S);
