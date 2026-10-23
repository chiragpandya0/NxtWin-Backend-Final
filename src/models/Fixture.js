const mongoose = require("mongoose");
const S = new mongoose.Schema(
  {
    homeTeamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true },
    awayTeamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true },
    kickoff: { type: Date, required: true, index: true },
    gameweek: { type: Number, required: true, index: true },
    status: { type: String, enum: ["scheduled", "finished", "postponed"], default: "scheduled" },
    postponedAt: Date,
    externalId: String,
  },
  { timestamps: true, versionKey: false }
);
module.exports = mongoose.models.Fixture || mongoose.model("Fixture", S);
