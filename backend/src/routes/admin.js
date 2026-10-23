const express = require("express");
const { z } = require("zod");
const { requireAdmin } = require("../middleware/auth");
const { validate } = require("../middleware/errors");
const { getSettings, updateSettings } = require("../config/settings");
const { withTx } = require("../config/db");
const Team = require("../models/Team");
const Player = require("../models/Player");
const Fixture = require("../models/Fixture");
const Market = require("../models/Market");
const MatchStat = require("../models/MatchStat");
const User = require("../models/User");
const LedgerEntry = require("../models/LedgerEntry");
const AuditLog = require("../models/AuditLog");
const PriceSnapshot = require("../models/PriceSnapshot");
const lmsr = require("../engine/lmsr");
const ledger = require("../services/ledger");
const marketGen = require("../services/marketGen");
const settlement = require("../services/settlement");
const reports = require("../services/reports");
const socket = require("../services/socket");
const { view } = require("./markets");

const router = express.Router();
router.use(requireAdmin);

const oid = z.string().regex(/^[a-f\d]{24}$/i);
const audit = (req, action, target, details) => AuditLog.create({ actorId: req.user._id, action, target, details });
const notFound = (what) => Object.assign(new Error(`${what} not found`), { status: 404 });

// ---- settings
router.get("/settings", async (req, res) => res.json({ settings: await getSettings() }));
router.put("/settings", validate(z.object({
  feeRate: z.number().min(0).max(0.2), defaultB: z.number().min(1), minProb: z.number().min(0.01).max(0.5),
  maxProb: z.number().min(0.5).max(0.99), maxAccaPayoutPence: z.number().int().min(100), sameMatchDiscount: z.number().min(0.5).max(1),
  startingBalancePence: z.number().int().min(0), topUpBelowPence: z.number().int().min(0), topUpToPence: z.number().int().min(0),
  minMinutesSample: z.number().min(0), maxTradeShares: z.number().min(1), voidPostponeHours: z.number().min(1),
}).partial()), async (req, res) => {
  const s = await updateSettings(req.body);
  await audit(req, "update_settings", "settings", req.body);
  res.json({ settings: s });
});

// ---- teams & players
const teamBody = z.object({ name: z.string().min(1), short: z.string().optional(), externalId: z.string().optional(),
  attackFactor: z.number().positive().optional(), defenceFactor: z.number().positive().optional() });
router.get("/teams", async (req, res) => res.json({ teams: await Team.find().sort({ name: 1 }).lean() }));
router.post("/teams", validate(teamBody), async (req, res) => res.status(201).json({ team: await Team.create(req.body) }));
router.put("/teams/:id", validate(teamBody.partial()), async (req, res) => {
  const t = await Team.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!t) throw notFound("Team");
  res.json({ team: t });
});

const playerBody = z.object({ name: z.string().min(1), teamId: oid, position: z.string().optional(), externalId: z.string().optional(),
  imageUrl: z.string().url().max(500).optional(),
  per90: z.record(z.string(), z.number().min(0)).optional(), minutesSample: z.number().min(0).optional(),
  expectedMinutes: z.number().min(0).max(120).optional(), active: z.boolean().optional() });
router.get("/players", async (req, res) => {
  const f = req.query.team ? { teamId: req.query.team } : {};
  res.json({ players: await Player.find(f).sort({ name: 1 }).limit(1000).lean() });
});
router.post("/players", validate(playerBody), async (req, res) => res.status(201).json({ player: await Player.create(req.body) }));
router.put("/players/:id", validate(playerBody.partial()), async (req, res) => {
  const p = await Player.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!p) throw notFound("Player");
  res.json({ player: p });
});
// Bulk import: [{ name, team, position, per90: {shots: 2.1}, minutesSample, expectedMinutes }]; teams matched by name.
router.post("/players/import", validate(z.object({ players: z.array(z.object({
  name: z.string().min(1), team: z.string().min(1), position: z.string().optional(), imageUrl: z.string().url().max(500).optional(),
  per90: z.record(z.string(), z.number().min(0)), minutesSample: z.number().min(0).optional(), expectedMinutes: z.number().optional(),
})).min(1).max(1000) })), async (req, res) => {
  let upserted = 0;
  for (const p of req.body.players) {
    const team = await Team.findOneAndUpdate({ name: p.team }, { $setOnInsert: { name: p.team } }, { upsert: true, new: true });
    await Player.findOneAndUpdate({ name: p.name, teamId: team._id },
      { name: p.name, teamId: team._id, position: p.position, ...(p.imageUrl && { imageUrl: p.imageUrl }), per90: p.per90, minutesSample: p.minutesSample ?? 0, expectedMinutes: p.expectedMinutes ?? 80 },
      { upsert: true });
    upserted += 1;
  }
  await audit(req, "import_players", "players", { count: upserted });
  res.json({ upserted });
});

// ---- fixtures
const fixtureBody = z.object({ homeTeamId: oid, awayTeamId: oid, kickoff: z.coerce.date(), gameweek: z.number().int().min(1),
  status: z.enum(["scheduled", "finished", "postponed"]).optional(), externalId: z.string().optional() });
router.get("/fixtures", async (req, res) => res.json({ fixtures: await Fixture.find().sort({ kickoff: -1 }).limit(300).lean() }));
router.post("/fixtures", validate(fixtureBody), async (req, res) => res.status(201).json({ fixture: await Fixture.create(req.body) }));
router.put("/fixtures/:id", validate(fixtureBody.partial()), async (req, res) => {
  const f = await Fixture.findById(req.params.id);
  if (!f) throw notFound("Fixture");
  if (req.body.status === "postponed" && f.status !== "postponed") f.postponedAt = new Date();
  Object.assign(f, req.body);
  await f.save();
  if (req.body.kickoff) await Market.updateMany({ fixtureId: f._id }, { kickoff: f.kickoff, gameweek: f.gameweek });
  await audit(req, "update_fixture", String(f._id), req.body);
  res.json({ fixture: f });
});

// ---- markets
router.get("/markets", async (req, res) => {
  const f = {};
  for (const k of ["fixtureId", "status", "gameweek"]) if (req.query[k]) f[k] = req.query[k];
  const markets = await Market.find(f).sort({ kickoff: 1, title: 1 }).limit(500).lean();
  res.json({ markets: markets.map((m) => view(m, { b: m.b, openProb: m.openProb, modelProb: m.modelProb, maxLoss: lmsr.maxLoss(m.b, m.openProb) })) });
});
router.post("/fixtures/:id/generate-markets", async (req, res) => {
  const r = await marketGen.generateForFixture(req.params.id);
  await audit(req, "generate_markets", req.params.id, { created: r.created.length });
  res.json({ created: r.created.length, skipped: r.skipped });
});
router.post("/fixtures/:id/open-markets", async (req, res) => {
  const n = await marketGen.openMarkets({ fixtureId: req.params.id });
  await audit(req, "open_markets", req.params.id, { opened: n });
  res.json({ opened: n });
});
router.post("/markets", validate(z.object({ fixtureId: oid, subjectType: z.enum(["player", "team"]), subjectId: oid, stat: z.string(),
  line: z.number(), title: z.string().min(1), openProb: z.number().min(0.06).max(0.94), b: z.number().min(1).optional(),
})), async (req, res) => {
  const s = await getSettings();
  const f = await Fixture.findById(req.body.fixtureId);
  if (!f) throw notFound("Fixture");
  const b = req.body.b ?? s.defaultB;
  const m = await Market.create({ ...req.body, b, modelProb: req.body.openProb, q: lmsr.seed(req.body.openProb, b), status: "draft", kickoff: f.kickoff, gameweek: f.gameweek });
  await audit(req, "create_market", String(m._id), req.body);
  res.status(201).json({ market: view(m) });
});
// Liquidity and opening probability can only change before trading starts (draft).
router.put("/markets/:id", validate(z.object({ b: z.number().min(1).optional(), openProb: z.number().min(0.06).max(0.94).optional(), title: z.string().optional() })), async (req, res) => {
  const m = await Market.findById(req.params.id);
  if (!m) throw notFound("Market");
  if (m.status !== "draft" && (req.body.b != null || req.body.openProb != null)) {
    return res.status(409).json({ error: "b and opening probability can only be changed while the market is a draft" });
  }
  Object.assign(m, req.body);
  if (req.body.b != null || req.body.openProb != null) m.q = lmsr.seed(m.openProb, m.b);
  await m.save();
  await audit(req, "edit_market", String(m._id), req.body);
  res.json({ market: view(m) });
});
router.post("/markets/:id/status", validate(z.object({ status: z.enum(["open", "suspended", "closed"]) })), async (req, res) => {
  const m = await Market.findById(req.params.id);
  if (!m) throw notFound("Market");
  if (["resolved", "void"].includes(m.status)) return res.status(409).json({ error: "Market is already settled" });
  const first = m.status === "draft";
  m.status = req.body.status;
  await m.save();
  if (first && m.status === "open") await PriceSnapshot.create({ marketId: m._id, pYes: lmsr.priceYes(m.q, m.b), q: m.q, reason: "open" });
  socket.emitMarketStatus(m._id, m.status);
  await audit(req, "market_status", String(m._id), { status: m.status });
  res.json({ market: view(m) });
});
router.post("/markets/:id/void", async (req, res) => {
  const r = await settlement.settleMarket(req.params.id, "void", req.user._id);
  res.json(r.noop ? { noop: true } : { voided: true });
});

// ---- results & settlement
router.put("/fixtures/:id/results", validate(z.object({ results: z.array(z.object({
  subjectType: z.enum(["player", "team"]), subjectId: oid, minutes: z.number().min(0).max(130).optional(),
  stats: z.record(z.string(), z.number().min(0)),
})).min(1) , finished: z.boolean().optional() })), async (req, res) => {
  const f = await Fixture.findById(req.params.id);
  if (!f) throw notFound("Fixture");
  for (const r of req.body.results) {
    await MatchStat.findOneAndUpdate({ fixtureId: f._id, subjectType: r.subjectType, subjectId: r.subjectId },
      { minutes: r.minutes ?? 0, stats: r.stats }, { upsert: true });
  }
  if (req.body.finished !== false) { f.status = "finished"; await f.save(); }
  await audit(req, "enter_results", String(f._id), { count: req.body.results.length });
  res.json({ saved: req.body.results.length });
});
router.post("/fixtures/:id/settle", async (req, res) => {
  const r = await settlement.settleFixture(req.params.id, req.user._id);
  res.json(r);
});
// Correct a settled market: reverses the previous payouts and pays the new outcome.
router.post("/markets/:id/settle", validate(z.object({ resolution: z.enum(["yes", "no", "void"]) })), async (req, res) => {
  res.json(await settlement.settleMarket(req.params.id, req.body.resolution, req.user._id));
});

// ---- users & ledger
router.get("/users", async (req, res) => {
  const users = await User.find({}, "email name role balancePence suspended createdAt").sort({ createdAt: -1 }).limit(500).lean();
  res.json({ users });
});
router.get("/users/:id/ledger", async (req, res) => {
  res.json({ entries: await LedgerEntry.find({ userId: req.params.id }).sort({ createdAt: -1 }).limit(500).lean() });
});
router.post("/users/:id/suspend", validate(z.object({ suspended: z.boolean() })), async (req, res) => {
  const u = await User.findByIdAndUpdate(req.params.id, { suspended: req.body.suspended }, { new: true });
  if (!u) throw notFound("User");
  await audit(req, "suspend_user", String(u._id), req.body);
  res.json({ ok: true });
});
router.post("/users/:id/adjust", validate(z.object({ amountPence: z.number().int().refine((n) => n !== 0), reason: z.string().min(3) })), async (req, res) => {
  const r = await withTx((session) => ledger.post(session, {
    userId: req.params.id, amountPence: req.body.amountPence, type: "admin_adjustment", refType: "User", refId: req.params.id,
    key: `adjust:${req.params.id}:${Date.now()}:${Math.random().toString(36).slice(2)}`, meta: { reason: req.body.reason, by: req.user._id },
  }));
  await audit(req, "adjust_balance", req.params.id, req.body);
  socket.emitBalance(req.params.id, r.balancePence);
  res.json({ balancePence: r.balancePence });
});

// ---- reports
router.get("/reports/exposure", async (req, res) => res.json({ markets: await reports.exposure() }));
router.get("/reports/reconcile", async (req, res) => res.json(await reports.reconcile()));
router.get("/reports/calibration", async (req, res) => {
  const rows = await reports.calibration();
  if (req.query.format === "csv") {
    const cols = Object.keys(rows[0] || { marketId: 1 });
    const esc = (v) => (v == null ? "" : `"${String(v).replace(/"/g, '""')}"`);
    res.type("text/csv").send([cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n"));
  } else res.json({ rows });
});
router.get("/reports/summary", async (req, res) => {
  const [users, open, resolved, volume] = await Promise.all([
    User.countDocuments(), Market.countDocuments({ status: "open" }), Market.countDocuments({ status: "resolved" }),
    Market.aggregate([{ $group: { _id: null, v: { $sum: "$volumePence" } } }]),
  ]);
  res.json({ users, openMarkets: open, resolvedMarkets: resolved, volumePence: volume[0]?.v || 0 });
});
router.get("/audit", async (req, res) => res.json({ log: await AuditLog.find().sort({ createdAt: -1 }).limit(200).lean() }));

module.exports = router;
