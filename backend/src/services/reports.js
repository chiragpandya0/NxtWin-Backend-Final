const User = require("../models/User");
const LedgerEntry = require("../models/LedgerEntry");
const Market = require("../models/Market");
const Position = require("../models/Position");
const Trade = require("../models/Trade");
const Accumulator = require("../models/Accumulator");
const PriceSnapshot = require("../models/PriceSnapshot");
const ReferencePrice = require("../models/ReferencePrice");
const lmsr = require("../engine/lmsr");

const PNL_TYPES = ["trade_buy", "trade_sell", "payout", "void_refund", "acca_stake", "acca_payout", "acca_sellback", "acca_refund", "settlement_reversal"];

// Every user's cached balance must equal the sum of their ledger entries.
const reconcile = async () => {
  const sums = await LedgerEntry.aggregate([{ $group: { _id: "$userId", total: { $sum: "$amountPence" } } }]);
  const byUser = new Map(sums.map((s) => [String(s._id), s.total]));
  const users = await User.find({}, "email balancePence").lean();
  const drift = users
    .map((u) => ({ userId: u._id, email: u.email, balancePence: u.balancePence, ledgerPence: byUser.get(String(u._id)) || 0 }))
    .filter((r) => r.balancePence !== r.ledgerPence);
  return { checked: users.length, drift, ok: drift.length === 0 };
};

// Weekly leaderboard: realised virtual profit on markets and accumulators of a gameweek.
const leaderboard = async (gameweek, limit = 50) => {
  const markets = await Market.find({ gameweek, status: { $in: ["resolved", "void"] } }, "_id").lean();
  const accas = await Accumulator.find({ gameweek, status: { $in: ["won", "lost", "void", "sold"] } }, "_id").lean();
  const marketIds = markets.map((m) => m._id);
  const accaIds = accas.map((a) => a._id);
  const rows = await LedgerEntry.aggregate([
    { $match: { type: { $in: PNL_TYPES }, $or: [{ "meta.marketId": { $in: marketIds } }, { "meta.accaId": { $in: accaIds } }] } },
    { $group: { _id: "$userId", profitPence: { $sum: "$amountPence" } } },
    { $sort: { profitPence: -1 } },
    { $limit: limit },
  ]);
  const users = await User.find({ _id: { $in: rows.map((r) => r._id) } }, "name").lean();
  const names = new Map(users.map((u) => [String(u._id), u.name]));
  return rows.map((r, i) => ({ rank: i + 1, name: names.get(String(r._id)), profitPence: r.profitPence }));
};

// House exposure per open market: worst-case loss = shares sold on the winning side minus cash collected.
const exposure = async () => {
  const markets = await Market.find({ status: { $in: ["open", "suspended", "closed"] } }).lean();
  const out = [];
  for (const m of markets) {
    const seed = lmsr.seed(m.openProb, m.b);
    const collected = lmsr.cost(m.q, m.b) - lmsr.cost(seed, m.b);
    const ifYes = m.q.yes - seed.yes - collected;
    const ifNo = m.q.no - seed.no - collected;
    out.push({ marketId: m._id, title: m.title, pYes: lmsr.priceYes(m.q, m.b), b: m.b,
      maxLossBound: lmsr.maxLoss(m.b, m.openProb), lossIfYes: ifYes, lossIfNo: ifNo, volumePence: m.volumePence });
  }
  return out;
};

// One row per resolved market, for model calibration.
const calibration = async () => {
  const markets = await Market.find({ status: "resolved" }).lean();
  const rows = [];
  for (const m of markets) {
    const last = await PriceSnapshot.findOne({ marketId: m._id }).sort({ createdAt: -1 }).lean();
    const refs = await ReferencePrice.find({ marketId: m._id }).lean();
    const avg = (src) => { const r = refs.filter((x) => x.source === src); return r.length ? r.reduce((a, x) => a + x.pYes, 0) / r.length : null; };
    const trades = await Trade.countDocuments({ marketId: m._id });
    rows.push({
      marketId: m._id, title: m.title, stat: m.stat, line: m.line, modelProb: m.modelProb, openProb: m.openProb,
      finalPrice: last ? last.pYes : null, betfairProb: avg("betfair"), bookmakerProb: avg("oddsapi"),
      outcome: m.resolution === "yes" ? 1 : 0, trades, volumePence: m.volumePence,
    });
  }
  return rows;
};

module.exports = { reconcile, leaderboard, exposure, calibration, Position };
