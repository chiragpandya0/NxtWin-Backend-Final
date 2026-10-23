const mongoose = require("mongoose");
const S = new mongoose.Schema(
  { actorId: mongoose.Schema.Types.ObjectId, action: { type: String, required: true }, target: String, details: {} },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false }
);
module.exports = mongoose.models.AuditLog || mongoose.model("AuditLog", S);
