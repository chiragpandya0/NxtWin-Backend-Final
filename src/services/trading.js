const mongoose = require("mongoose");
const { withTx } = require("../config/db");
const { getSettings } = require("../config/settings");
const Market = require("../models/Market");
const Position = require("../models/Position");
const Trade = require("../models/Trade");
const PriceSnapshot = require("../models/PriceSnapshot");
const lmsr = require("../engine/lmsr");
const { repairLadder } = require("../engine/ladder");
const { ceilPence, floorPence } = require("../engine/money");
const ledger = require("./ledger");
const socket = require("./socket");

const { err } = ledger;

// Price a trade against a market state. Pure given (market, settings).
const priceTrade = (market, settings, { side, action, shares, spendPence }) => {
  const { b } = market;
  const q = market.q;
  let n = shares;
  if (n == null) {
    if (action !== "buy" || !spendPence) throw err(400, "BAD_REQUEST", "Provide shares, or spendPence for a buy");
    // Spend includes the fee: gross = spend / (1 + fee).
    n = lmsr.sharesForSpend(q, b, side, spendPence / 100 / (1 + settings.feeRate));
    n = Math.floor(n * 100) / 100; // trade in hundredths of a share
  }
  if (!(n > 0) || n > settings.maxTradeShares) throw err(400, "BAD_QUANTITY", "Invalid share quantity");
  n = Math.round(n * 100) / 100;

  const priceBefore = lmsr.priceYes(q, b);
  const compute = (shares) => {
    const gross = action === "buy" ? lmsr.buyCost(q, b, side, shares) : lmsr.sellProceeds(q, b, side, shares);
    const grossPence = action === "buy" ? ceilPence(gross * 100) : floorPence(gross * 100);
    const feePence = Math.ceil(grossPence * settings.feeRate - 1e-9);
    return { grossPence, feePence, netPence: action === "buy" ? grossPence + feePence : Math.max(0, grossPence - feePence) };
  };
  let { grossPence, feePence, netPence } = compute(n);
  // A spend-based buy must never cost more than the amount asked for (penny rounding).
  while (shares == null && spendPence && netPence > spendPence && n > 0.01) {
    n = Math.round((n - 0.01) * 100) / 100;
    ({ grossPence, feePence, netPence } = compute(n));
  }
  const qAfter = lmsr.add(q, side, action === "buy" ? n : -n);
  return {
    shares: n, grossPence, feePence, netPence, avgPrice: netPence / 100 / n,
    priceBefore, priceAfter: lmsr.priceYes(qAfter, b), qAfter,
  };
};

const assertTradable = (market) => {
  if (!market) throw err(404, "MARKET_NOT_FOUND", "Market not found");
  if (market.status !== "open") throw err(409, "MARKET_NOT_OPEN", `Market is ${market.status}`);
  if (market.kickoff <= new Date()) throw err(409, "MARKET_CLOSED", "Trading closed at kickoff");
};

const quote = async (userId, input) => {
  const market = await Market.findById(input.marketId).lean();
  assertTradable(market);
  const settings = await getSettings();
  if (input.action === "sell") {
    const pos = await Position.findOne({ userId, marketId: market._id, side: input.side }).lean();
    if (!pos || pos.shares + 1e-9 < input.shares) throw err(400, "NO_POSITION", "You do not hold that many shares");
  }
  const t = priceTrade(market, settings, input);
  return { marketId: market._id, side: input.side, action: input.action, ...t, qAfter: undefined };
};

// Pull markets in the same ladder (fixture, subject, stat) into order after a trade.
const repairLadderIn = async (session, traded) => {
  const siblings = await Market.find({
    fixtureId: traded.fixtureId, subjectType: traded.subjectType, subjectId: traded.subjectId,
    stat: traded.stat, status: "open",
  }).session(session);
  if (siblings.length < 2) return [];
  const rows = siblings.map((m) => ({ id: String(m._id), line: m.line, p: lmsr.priceYes(m.q, m.b) }));
  const changes = repairLadder(rows, { pinned: String(traded._id) });
  const moved = [];
  for (const c of changes) {
    const m = siblings.find((s) => String(s._id) === c.id);
    const t = Math.min(0.999, Math.max(0.001, c.to));
    const newQ = { yes: m.q.no + m.b * Math.log(t / (1 - t)), no: m.q.no };
    await Market.updateOne({ _id: m._id }, { $set: { q: newQ }, $inc: { version: 1 } }, { session });
    await PriceSnapshot.create([{ marketId: m._id, pYes: t, q: newQ, reason: "ladder_adjust" }], { session });
    moved.push({ marketId: m._id, pYes: t });
  }
  return moved;
};

const execute = async (userId, input) => {
  const settings = await getSettings();
  const { side, action } = input;
  const key = input.idempotencyKey; // optional client key for safe retries

  const out = await withTx(async (session) => {
    const market = await Market.findById(input.marketId).session(session);
    assertTradable(market);
    const pos = await Position.findOne({ userId, marketId: market._id, side }).session(session);
    if (action === "sell" && (!pos || pos.shares + 1e-9 < input.shares)) {
      throw err(400, "NO_POSITION", "You do not hold that many shares");
    }

    const t = priceTrade(market, settings, input);
    if (action === "buy" && input.maxCostPence != null && t.netPence > input.maxCostPence) {
      throw err(409, "PRICE_MOVED", "Price moved beyond your limit");
    }
    if (action === "sell" && input.minProceedsPence != null && t.netPence < input.minProceedsPence) {
      throw err(409, "PRICE_MOVED", "Price moved beyond your limit");
    }

    // Optimistic version guard on the market state.
    const upd = await Market.updateOne(
      { _id: market._id, version: market.version },
      { $set: { q: t.qAfter }, $inc: { version: 1, volumePence: t.grossPence } },
      { session }
    );
    if (upd.modifiedCount !== 1) throw err(409, "CONFLICT", "Market changed, retry");

    const [trade] = await Trade.create([{
      userId, marketId: market._id, side, action, shares: t.shares, grossPence: t.grossPence,
      feePence: t.feePence, netPence: t.netPence, avgPrice: t.avgPrice,
      priceBefore: t.priceBefore, priceAfter: t.priceAfter,
    }], { session });

    const posExisting = pos || (await Position.create([{ userId, marketId: market._id, side }], { session }))[0];
    if (action === "buy") {
      posExisting.shares += t.shares;
      posExisting.costPence += t.netPence;
    } else {
      const frac = t.shares / posExisting.shares;
      posExisting.costPence -= Math.round(posExisting.costPence * frac);
      posExisting.shares = Math.max(0, posExisting.shares - t.shares);
    }
    posExisting.shares = Math.round(posExisting.shares * 100) / 100;
    await posExisting.save({ session });

    const l = await ledger.post(session, {
      userId, amountPence: action === "buy" ? -t.netPence : t.netPence,
      type: action === "buy" ? "trade_buy" : "trade_sell", refType: "Trade", refId: trade._id,
      key: key ? `trade:${userId}:${key}` : `trade:${trade._id}`, meta: { marketId: market._id, side, shares: t.shares },
    });

    await PriceSnapshot.create([{ marketId: market._id, pYes: t.priceAfter, q: t.qAfter, reason: "trade" }], { session });
    const moved = await repairLadderIn(session, { ...market.toObject(), _id: market._id });
    return { trade, t, balancePence: l.balancePence, moved };
  });

  socket.emitPrice(input.marketId, out.t.priceAfter);
  for (const m of out.moved) socket.emitPrice(m.marketId, m.pYes, { ladder: true });
  socket.emitBalance(userId, out.balancePence);
  return {
    tradeId: out.trade._id, shares: out.t.shares, grossPence: out.t.grossPence, feePence: out.t.feePence,
    netPence: out.t.netPence, avgPrice: out.t.avgPrice, priceBefore: out.t.priceBefore,
    priceAfter: out.t.priceAfter, balancePence: out.balancePence,
  };
};

module.exports = { quote, execute, priceTrade, assertTradable };
