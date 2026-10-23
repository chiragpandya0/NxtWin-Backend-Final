const { withTx } = require("../config/db");
const { getSettings } = require("../config/settings");
const Market = require("../models/Market");
const Accumulator = require("../models/Accumulator");
const lmsr = require("../engine/lmsr");
const acca = require("../engine/acca");
const ledger = require("./ledger");
const socket = require("./socket");
const { assertTradable } = require("./trading");

const { err } = ledger;
const MIN_STAKE_PENCE = 100;

const loadLegs = async (inputLegs, session = null) => {
  if (!Array.isArray(inputLegs) || inputLegs.length < 2 || inputLegs.length > 6) {
    throw err(400, "BAD_LEGS", "An accumulator needs 2 to 6 legs");
  }
  const ids = inputLegs.map((l) => String(l.marketId));
  if (new Set(ids).size !== ids.length) throw err(400, "DUPLICATE_LEG", "Each market can only be used once");
  const legs = [];
  for (const l of inputLegs) {
    const q = Market.findById(l.marketId);
    const m = await (session ? q.session(session) : q);
    assertTradable(m);
    const p = lmsr.priceOf(m.q, m.b, l.side);
    legs.push({ marketId: m._id, fixtureId: m.fixtureId, side: l.side, p, lockedP: p, kickoff: m.kickoff, gameweek: m.gameweek, title: m.title });
  }
  return legs;
};

const priceEntry = async (legs, stakePence) => {
  const s = await getSettings();
  if (!Number.isInteger(stakePence) || stakePence < MIN_STAKE_PENCE) throw err(400, "BAD_STAKE", "Minimum stake is £1");
  const feePence = Math.ceil(stakePence * s.feeRate - 1e-9);
  const q = acca.quote(legs, stakePence - feePence, { sameMatchDiscount: s.sameMatchDiscount, maxPayoutPence: s.maxAccaPayoutPence });
  return { feePence, ...q };
};

const quote = async ({ legs: inputLegs, stakePence }) => {
  const legs = await loadLegs(inputLegs);
  const priced = await priceEntry(legs, stakePence);
  return { legs: legs.map(({ marketId, side, p, title }) => ({ marketId, side, p, title })), stakePence, ...priced };
};

const place = async (userId, { legs: inputLegs, stakePence, maxPayoutDropPence }) => {
  const doc = await withTx(async (session) => {
    const legs = await loadLegs(inputLegs, session);
    const priced = await priceEntry(legs, stakePence);
    const [a] = await Accumulator.create([{
      userId, stakePence, feePence: priced.feePence, payoutPence: priced.payoutPence,
      legs: legs.map(({ marketId, fixtureId, side, lockedP }) => ({ marketId, fixtureId, side, lockedP })),
      firstKickoff: new Date(Math.min(...legs.map((l) => l.kickoff))), gameweek: Math.max(...legs.map((l) => l.gameweek)),
    }], { session });
    const l = await ledger.post(session, {
      userId, amountPence: -stakePence, type: "acca_stake", refType: "Accumulator", refId: a._id,
      key: `acca-stake:${a._id}`, meta: { accaId: a._id },
    });
    return { accumulator: a, balancePence: l.balancePence };
  });
  socket.emitBalance(userId, doc.balancePence);
  return doc;
};

const sellBack = async (userId, accaId) => {
  const s = await getSettings();
  const out = await withTx(async (session) => {
    const a = await Accumulator.findOne({ _id: accaId, userId }).session(session);
    if (!a) throw err(404, "NOT_FOUND", "Accumulator not found");
    if (a.status !== "open") throw err(409, "NOT_OPEN", "Accumulator is not open");
    if (a.firstKickoff <= new Date()) throw err(409, "LOCKED", "Sell-back closes at the first kickoff");
    const current = [];
    for (const leg of a.legs) {
      const m = await Market.findById(leg.marketId).session(session);
      if (!m || m.status !== "open") throw err(409, "MARKET_NOT_OPEN", "A leg's market is not open");
      current.push({ p: lmsr.priceOf(m.q, m.b, leg.side) });
    }
    const value = acca.sellBackValue(a.payoutPence, current, s.feeRate);
    a.status = "sold";
    a.settledPayoutPence = value;
    await a.save({ session });
    const l = await ledger.post(session, {
      userId, amountPence: value, type: "acca_sellback", refType: "Accumulator", refId: a._id,
      key: `acca-sell:${a._id}`, meta: { accaId: a._id },
    });
    return { valuePence: value, balancePence: l.balancePence };
  });
  socket.emitBalance(userId, out.balancePence);
  return out;
};

module.exports = { quote, place, sellBack };
