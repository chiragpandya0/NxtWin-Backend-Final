const { withTx } = require("../config/db");
const { getSettings } = require("../config/settings");
const User = require("../models/User");
const ledger = require("./ledger");
const socket = require("./socket");

const { err } = ledger;

const signupGrant = async (session, user) => {
  const s = await getSettings();
  return ledger.post(session, {
    userId: user._id, amountPence: s.startingBalancePence, type: "signup_grant",
    refType: "User", refId: user._id, key: `signup:${user._id}`,
  });
};

// Top-up rule (configurable): allowed when the balance is below `topUpBelowPence`,
// at most once per 7 days; tops the balance up to `topUpToPence`.
const topUp = async (userId) => {
  const s = await getSettings();
  const out = await withTx(async (session) => {
    const user = await User.findById(userId).session(session);
    if (user.balancePence >= s.topUpBelowPence) throw err(400, "NOT_ELIGIBLE", "Top-up is only available when your balance is low");
    if (user.lastTopUpAt && Date.now() - user.lastTopUpAt.getTime() < 7 * 864e5) throw err(400, "TOO_SOON", "You can top up once every 7 days");
    const stamp = new Date();
    const r = await ledger.post(session, {
      userId, amountPence: s.topUpToPence - user.balancePence, type: "top_up", refType: "User", refId: userId,
      key: `topup:${userId}:${stamp.toISOString()}`,
    });
    await User.updateOne({ _id: userId }, { lastTopUpAt: stamp }, { session });
    return r;
  });
  socket.emitBalance(userId, out.balancePence);
  return { balancePence: out.balancePence };
};

module.exports = { signupGrant, topUp };
