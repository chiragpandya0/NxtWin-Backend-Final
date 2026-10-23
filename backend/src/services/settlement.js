const { withTx } = require("../config/db");
const { getSettings } = require("../config/settings");
const Market = require("../models/Market");
const Fixture = require("../models/Fixture");
const MatchStat = require("../models/MatchStat");
const Position = require("../models/Position");
const Accumulator = require("../models/Accumulator");
const LedgerEntry = require("../models/LedgerEntry");
const AuditLog = require("../models/AuditLog");
const acca = require("../engine/acca");
const ledger = require("./ledger");
const socket = require("./socket");

const { err } = ledger;

// Decide a market's outcome from stored results. Returns "yes" | "no" | "void" | null (not decidable yet).
const resolveFromResults = async (market, fixture, settings) => {
  if (fixture.status === "postponed") {
    const hours = (Date.now() - (fixture.postponedAt || fixture.kickoff).getTime()) / 36e5;
    return hours >= settings.voidPostponeHours ? "void" : null;
  }
  if (fixture.status !== "finished") return null;
  const stat = await MatchStat.findOne({ fixtureId: fixture._id, subjectType: market.subjectType, subjectId: market.subjectId });
  if (market.subjectType === "player" && (!stat || stat.minutes <= 0)) return "void"; // did not play
  if (!stat) return null;
  const value = stat.stats.get(market.stat);
  if (value == null) return null;
  return value > market.line ? "yes" : "no";
};

// Pay (or refund) every holder for one market version. Idempotent through ledger keys.
const payHolders = async (session, market, resolution, version) => {
  const positions = await Position.find({ marketId: market._id, shares: { $gt: 0 } }).session(session);
  const touched = [];
  for (const pos of positions) {
    let amount = 0;
    let type = "payout";
    if (resolution === "void") {
      amount = Math.max(0, pos.costPence);
      type = "void_refund";
    } else if (pos.side === resolution) {
      amount = Math.floor(pos.shares * 100 + 1e-9);
    }
    pos.settled = true;
    await pos.save({ session });
    if (amount <= 0) continue;
    const r = await ledger.post(session, {
      userId: pos.userId, amountPence: amount, type, refType: "Market", refId: market._id,
      key: `settle:${market._id}:v${version}:${pos.userId}:${pos.side}`, meta: { marketId: market._id, side: pos.side },
    });
    if (!r.duplicate) touched.push({ userId: pos.userId, balancePence: r.balancePence });
  }
  return touched;
};

// Reverse what a previous settlement version paid. Balances may go negative here by design;
// the ledger stays the source of truth and reconcile still balances.
const reversePrevious = async (session, market, prevVersion) => {
  const paid = await LedgerEntry.find({
    idempotencyKey: { $regex: `^settle:${market._id}:v${prevVersion}:` },
  }).session(session);
  const touched = [];
  for (const e of paid) {
    const r = await ledger.post(session, {
      userId: e.userId, amountPence: -e.amountPence, type: "settlement_reversal", refType: "Market", refId: market._id,
      key: `reverse:${e.idempotencyKey}`, meta: { marketId: market._id, reverses: e._id }, allowNegative: true,
    });
    if (!r.duplicate) touched.push({ userId: e.userId, balancePence: r.balancePence });
  }
  return touched;
};

// Settle one market to a resolution. Re-running with the same resolution is a no-op;
// a different resolution is treated as a correction (reverse, then pay the new outcome).
const settleMarket = async (marketId, resolution, actorId = null) => {
  if (!["yes", "no", "void"].includes(resolution)) throw err(400, "BAD_RESOLUTION", "Resolution must be yes, no or void");
  const result = await withTx(async (session) => {
    const market = await Market.findById(marketId).session(session);
    if (!market) throw err(404, "MARKET_NOT_FOUND", "Market not found");
    if (market.resolution === resolution && ["resolved", "void"].includes(market.status)) return { noop: true, touched: [] };

    const touched = [];
    if (market.resolution) touched.push(...(await reversePrevious(session, market, market.settlementVersion)));
    const version = market.settlementVersion + 1;
    market.settlementVersion = version;
    market.resolution = resolution;
    market.status = resolution === "void" ? "void" : "resolved";
    market.resolvedAt = new Date();
    await market.save({ session });
    touched.push(...(await payHolders(session, market, resolution, version)));

    await AuditLog.create([{ actorId, action: "settle_market", target: String(market._id), details: { resolution, version } }], { session });
    return { noop: false, touched, status: market.status };
  });

  if (!result.noop) {
    await settleAccumulatorsFor(marketId);
    socket.emitMarketStatus(marketId, result.status, resolution);
  }
  for (const t of result.touched) socket.emitBalance(t.userId, t.balancePence);
  return result;
};

// Re-evaluate every accumulator that includes this market.
const settleAccumulatorsFor = async (marketId) => {
  const accas = await Accumulator.find({ "legs.marketId": marketId, status: { $ne: "sold" } });
  for (const a of accas) await settleAccumulator(a._id);
};

const settleAccumulator = async (accaId) => {
  const s = await getSettings();
  const touched = await withTx(async (session) => {
    const a = await Accumulator.findById(accaId).session(session);
    if (!a || a.status === "sold") return [];

    // Refresh each leg's result from its market.
    for (const leg of a.legs) {
      const m = await Market.findById(leg.marketId).session(session);
      if (!m || !m.resolution) leg.result = "pending";
      else if (m.resolution === "void") leg.result = "void";
      else leg.result = m.resolution === leg.side ? "won" : "lost";
    }
    if (a.legs.some((l) => l.result === "pending")) {
      a.markModified("legs");
      await a.save({ session });
      return [];
    }

    // Decide outcome: any lost leg loses; void legs drop out; all-void refunds the stake.
    const live = a.legs.filter((l) => l.result !== "void");
    let status, payout;
    if (live.some((l) => l.result === "lost")) { status = "lost"; payout = 0; }
    else if (live.length === 0) { status = "void"; payout = a.stakePence; }
    else {
      status = "won";
      const q = acca.quote(live.map((l) => ({ p: l.lockedP, fixtureId: String(l.fixtureId) })), a.stakePence - a.feePence,
        { sameMatchDiscount: s.sameMatchDiscount, maxPayoutPence: s.maxAccaPayoutPence });
      payout = q.payoutPence;
    }
    if (a.status === status && a.settledPayoutPence === payout) return [];

    const out = [];
    if (a.settlementVersion > 0 && a.settledPayoutPence > 0) {
      const r = await ledger.post(session, {
        userId: a.userId, amountPence: -a.settledPayoutPence, type: "settlement_reversal", refType: "Accumulator", refId: a._id,
        key: `acca-reverse:${a._id}:v${a.settlementVersion}`, meta: { accaId: a._id }, allowNegative: true,
      });
      if (!r.duplicate) out.push({ userId: a.userId, balancePence: r.balancePence });
    }
    a.settlementVersion += 1;
    a.status = status;
    a.settledPayoutPence = payout;
    a.markModified("legs");
    await a.save({ session });
    if (payout > 0) {
      const r = await ledger.post(session, {
        userId: a.userId, amountPence: payout, type: status === "void" ? "acca_refund" : "acca_payout",
        refType: "Accumulator", refId: a._id, key: `acca-pay:${a._id}:v${a.settlementVersion}`, meta: { accaId: a._id },
      });
      if (!r.duplicate) out.push({ userId: a.userId, balancePence: r.balancePence });
    }
    return out;
  });
  for (const t of touched) socket.emitBalance(t.userId, t.balancePence);
};

// Settle every undecided market of a fixture from stored results (used by admin and the cron job).
const settleFixture = async (fixtureId, actorId = null) => {
  const s = await getSettings();
  const fixture = await Fixture.findById(fixtureId);
  if (!fixture) throw err(404, "FIXTURE_NOT_FOUND", "Fixture not found");
  const markets = await Market.find({ fixtureId, status: { $in: ["open", "suspended", "closed"] } });
  const summary = { settled: 0, pending: 0 };
  for (const m of markets) {
    const resolution = await resolveFromResults(m, fixture, s);
    if (!resolution) { summary.pending += 1; continue; }
    await settleMarket(m._id, resolution, actorId);
    summary.settled += 1;
  }
  return summary;
};

module.exports = { settleMarket, settleFixture, settleAccumulator, resolveFromResults };
