const express = require("express");
const { z } = require("zod");
const { requireAuth } = require("../middleware/auth");
const { validate } = require("../middleware/errors");
const rateLimit = require("express-rate-limit");
const env = require("../config/env");
const trading = require("../services/trading");
const accumulators = require("../services/accumulators");
const wallet = require("../services/wallet");
const Position = require("../models/Position");
const Market = require("../models/Market");
const Trade = require("../models/Trade");
const Accumulator = require("../models/Accumulator");
const LedgerEntry = require("../models/LedgerEntry");
const lmsr = require("../engine/lmsr");

const router = express.Router();
router.use(requireAuth);
router.use(rateLimit({ windowMs: 60 * 1000, limit: env.isTest ? 10000 : 120, standardHeaders: true, legacyHeaders: false }));

const oid = z.string().regex(/^[a-f\d]{24}$/i);
const side = z.enum(["yes", "no"]);
const tradeBody = z.object({
  marketId: oid, side, action: z.enum(["buy", "sell"]),
  shares: z.number().positive().optional(),
  spendPence: z.number().int().positive().optional(),
  maxCostPence: z.number().int().positive().optional(),
  minProceedsPence: z.number().int().min(0).optional(),
  idempotencyKey: z.string().min(8).max(64).optional(),
}).refine((b) => b.shares != null || b.spendPence != null, "shares or spendPence required");

router.post("/trade/quote", validate(tradeBody), async (req, res) => {
  res.json({ quote: await trading.quote(req.user._id, req.body) });
});

router.post("/trade/execute", validate(tradeBody), async (req, res) => {
  res.status(201).json({ trade: await trading.execute(req.user._id, req.body) });
});

const legs = z.array(z.object({ marketId: oid, side })).min(2).max(6);
const accaBody = z.object({ legs, stakePence: z.number().int().positive() });

router.post("/accas/quote", validate(accaBody), async (req, res) => res.json({ quote: await accumulators.quote(req.body) }));
router.post("/accas", validate(accaBody), async (req, res) => {
  const r = await accumulators.place(req.user._id, req.body);
  res.status(201).json({ accumulator: r.accumulator, balancePence: r.balancePence });
});
router.post("/accas/:id/sell", async (req, res) => res.json(await accumulators.sellBack(req.user._id, req.params.id)));

router.post("/wallet/top-up", async (req, res) => res.json(await wallet.topUp(req.user._id)));

router.get("/portfolio", async (req, res) => {
  const positions = await Position.find({ userId: req.user._id, shares: { $gt: 0 } }).lean();
  const markets = new Map((await Market.find({ _id: { $in: positions.map((p) => p.marketId) } }).lean()).map((m) => [String(m._id), m]));
  const out = positions.map((p) => {
    const m = markets.get(String(p.marketId));
    const price = m ? lmsr.priceOf(m.q, m.b, p.side) : 0;
    return { marketId: p.marketId, title: m?.title, side: p.side, shares: p.shares, costPence: p.costPence,
      status: m?.status, resolution: m?.resolution, price, valuePence: Math.floor(p.shares * price * 100) };
  });
  const accas = await Accumulator.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(100).lean();
  const trades = await Trade.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(100).lean();
  res.json({
    balancePence: req.user.balancePence,
    positions: out.filter((p) => !["resolved", "void"].includes(p.status)),
    settledPositions: out.filter((p) => ["resolved", "void"].includes(p.status)),
    accumulators: accas, trades,
  });
});

router.get("/ledger", async (req, res) => {
  const entries = await LedgerEntry.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(200).lean();
  res.json({ entries });
});

module.exports = router;
