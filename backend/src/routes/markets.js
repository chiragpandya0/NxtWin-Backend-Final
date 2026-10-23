const express = require("express");
const mongoose = require("mongoose");
const Market = require("../models/Market");
const Fixture = require("../models/Fixture");
const Player = require("../models/Player");
const Team = require("../models/Team");
const PriceSnapshot = require("../models/PriceSnapshot");
const lmsr = require("../engine/lmsr");
const { reconcile, leaderboard } = require("../services/reports");

const router = express.Router();

const view = (m, extra = {}) => ({
  id: m._id, fixtureId: m.fixtureId, subjectType: m.subjectType, subjectId: m.subjectId,
  stat: m.stat, line: m.line, title: m.title, status: m.status, resolution: m.resolution,
  kickoff: m.kickoff, gameweek: m.gameweek, volumePence: m.volumePence,
  yesPrice: lmsr.priceYes(m.q, m.b), noPrice: 1 - lmsr.priceYes(m.q, m.b), ...extra,
});

const bad = (res) => res.status(400).json({ error: "Invalid id" });

router.get("/markets", async (req, res) => {
  const f = { status: { $in: ["open", "suspended", "closed", "resolved", "void"] } };
  if (req.query.fixture) f.fixtureId = req.query.fixture;
  if (req.query.player) { f.subjectType = "player"; f.subjectId = req.query.player; }
  if (req.query.stat) f.stat = req.query.stat;
  if (req.query.gameweek) f.gameweek = Number(req.query.gameweek);
  if (req.query.status) f.status = req.query.status;
  for (const id of [f.fixtureId, f.subjectId]) if (id && !mongoose.isValidObjectId(id)) return bad(res);
  const markets = await Market.find(f).sort({ kickoff: 1, title: 1 }).limit(200).lean();
  res.json({ markets: markets.map((m) => view(m)) });
});

router.get("/markets/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return bad(res);
  const m = await Market.findById(req.params.id).lean();
  if (!m || m.status === "draft") return res.status(404).json({ error: "Market not found" });
  const ladder = await Market.find({ fixtureId: m.fixtureId, subjectType: m.subjectType, subjectId: m.subjectId, stat: m.stat, status: { $ne: "draft" } })
    .sort({ line: 1 }).lean();
  const fixture = await Fixture.findById(m.fixtureId).lean();
  res.json({ market: view(m, { ladder: ladder.map((l) => ({ id: l._id, line: l.line, yesPrice: lmsr.priceYes(l.q, l.b) })), fixture }) });
});

router.get("/markets/:id/history", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return bad(res);
  const snaps = await PriceSnapshot.find({ marketId: req.params.id }).sort({ createdAt: 1 }).limit(2000).lean();
  res.json({ history: snaps.map((s) => ({ t: s.createdAt, pYes: s.pYes, reason: s.reason })) });
});

router.get("/fixtures", async (req, res) => {
  const f = {};
  if (req.query.gameweek) f.gameweek = Number(req.query.gameweek);
  const fixtures = await Fixture.find(f).sort({ kickoff: 1 }).limit(200).lean();
  const teams = new Map((await Team.find().lean()).map((t) => [String(t._id), t]));
  res.json({ fixtures: fixtures.map((x) => ({ ...x, home: teams.get(String(x.homeTeamId))?.name, away: teams.get(String(x.awayTeamId))?.name })) });
});

router.get("/players/:id/markets", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return bad(res);
  const [player, markets] = await Promise.all([
    Player.findById(req.params.id).lean(),
    Market.find({ subjectType: "player", subjectId: req.params.id, status: { $ne: "draft" } }).sort({ kickoff: 1, stat: 1, line: 1 }).lean(),
  ]);
  if (!player) return res.status(404).json({ error: "Player not found" });
  res.json({ player: { id: player._id, name: player.name, position: player.position }, markets: markets.map((m) => view(m)) });
});

router.get("/leaderboard", async (req, res) => {
  let gw = Number(req.query.gameweek);
  if (!gw) {
    const last = await Fixture.findOne({ kickoff: { $lte: new Date() } }).sort({ kickoff: -1 }).lean();
    gw = last ? last.gameweek : 1;
  }
  res.json({ gameweek: gw, leaderboard: await leaderboard(gw) });
});

module.exports = router;
module.exports.view = view;
