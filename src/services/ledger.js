const User = require("../models/User");
const LedgerEntry = require("../models/LedgerEntry");

const err = (status, code, message) => Object.assign(new Error(message), { status, code });

// Post one ledger entry and move the cached balance in the same transaction.
// Debits are conditional on sufficient funds (fixes check-then-save races).
// Returns { duplicate: true } when the idempotency key was already used.
const post = async (session, { userId, amountPence, type, refType, refId, key, meta, allowNegative = false }) => {
  if (!Number.isInteger(amountPence)) throw new Error("amountPence must be an integer");
  const existing = await LedgerEntry.findOne({ idempotencyKey: key }).session(session);
  if (existing) return { duplicate: true, entry: existing };

  const filter = { _id: userId };
  if (amountPence < 0 && !allowNegative) filter.balancePence = { $gte: -amountPence };
  const user = await User.findOneAndUpdate(filter, { $inc: { balancePence: amountPence } }, { new: true, session });
  if (!user) {
    const exists = await User.exists({ _id: userId }).session(session);
    throw exists ? err(400, "INSUFFICIENT_FUNDS", "Insufficient balance") : err(404, "USER_NOT_FOUND", "User not found");
  }
  const [entry] = await LedgerEntry.create(
    [{ userId, amountPence, type, refType, refId, idempotencyKey: key, balanceAfter: user.balancePence, meta }],
    { session }
  );
  return { duplicate: false, entry, balancePence: user.balancePence };
};

module.exports = { post, err };
