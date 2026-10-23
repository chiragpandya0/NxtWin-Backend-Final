const mongoose = require("mongoose");
const TYPES = [
  "signup_grant", "top_up", "trade_buy", "trade_sell", "payout", "void_refund",
  "acca_stake", "acca_payout", "acca_sellback", "acca_refund", "settlement_reversal", "admin_adjustment",
];
const S = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    amountPence: { type: Number, required: true }, // signed; + credits the user
    type: { type: String, enum: TYPES, required: true },
    refType: String,
    refId: mongoose.Schema.Types.ObjectId,
    idempotencyKey: { type: String, required: true, unique: true },
    balanceAfter: { type: Number, required: true },
    meta: {},
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false }
);
S.index({ userId: 1, createdAt: 1 });
module.exports = mongoose.models.LedgerEntry || mongoose.model("LedgerEntry", S);
module.exports.TYPES = TYPES;
