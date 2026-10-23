const mongoose = require("mongoose");
const S = new mongoose.Schema(
  {
    fixtureId: { type: mongoose.Schema.Types.ObjectId, ref: "Fixture", required: true, index: true },
    subjectType: { type: String, enum: ["player", "team"], required: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, required: true },
    stat: { type: String, required: true },
    line: { type: Number, required: true },
    title: { type: String, required: true },
    b: { type: Number, required: true, min: 1 },
    openProb: { type: Number, required: true, min: 0.01, max: 0.99 },
    modelProb: Number,
    q: { yes: { type: Number, default: 0 }, no: { type: Number, default: 0 } },
    version: { type: Number, default: 0 },
    status: { type: String, enum: ["draft", "open", "suspended", "closed", "resolved", "void"], default: "draft", index: true },
    resolution: { type: String, enum: ["yes", "no", "void", null], default: null },
    settlementVersion: { type: Number, default: 0 },
    resolvedAt: Date,
    volumePence: { type: Number, default: 0 },
    kickoff: { type: Date, required: true },
    gameweek: { type: Number, required: true },
  },
  { timestamps: true, versionKey: false }
);
S.index({ fixtureId: 1, subjectType: 1, subjectId: 1, stat: 1, line: 1 }, { unique: true });
module.exports = mongoose.models.Market || mongoose.model("Market", S);
