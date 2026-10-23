const mongoose = require("mongoose");
const S = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    dob: { type: Date, required: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    // Cached projection of the ledger; only changed together with a LedgerEntry.
    balancePence: { type: Number, default: 0, min: 0 },
    lastTopUpAt: { type: Date, default: null },
    suspended: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false }
);
module.exports = mongoose.models.User || mongoose.model("User", S);
