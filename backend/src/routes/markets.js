const express = require("express");
const mongoose = require("mongoose");
const Market = require("../models/Market");
const Fixture = require("../models/Fixture");
const Player = require("../models/Player");
const Team = require("../models/Team");
const PriceSnapshot = require("../models/PriceSnapshot");
const lmsr = require("../engine/lmsr");
const { reconcile, leaderboard } = require("../services/reports");
const { STATS } = require("../services/marketGen");

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
  const subject = await subjectInfo(m);
  res.json({ market: view(m, { subject, ladder: ladder.map((l) => ({ id: l._id, line: l.line, yesPrice: lmsr.priceYes(l.q, l.b) })), fixture }) });
});

// Player/team behind a market, with their team name and optional image.
const subjectInfo = async (m) => {
  if (m.subjectType !== "player") return null;
  const player = await Player.findById(m.subjectId).lean();
  if (!player) return null;
  const team = await Team.findById(player.teamId).lean();
  return { id: player._id, name: player.name, position: player.position, imageUrl: player.imageUrl || null, team: team?.name || null };
};

// Markets consolidated per player per fixture, each stat shown as a ladder of lines.
router.get("/market-groups", async (req, res) => {
  const f = { status: { $in: req.query.status ? [req.query.status] : ["open", "suspended", "closed"] } };
  if (req.query.fixture) { if (!mongoose.isValidObjectId(req.query.fixture)) return bad(res); f.fixtureId = req.query.fixture; }
  if (req.query.gameweek) f.gameweek = Number(req.query.gameweek);
  const markets = await Market.find(f).sort({ kickoff: 1, line: 1 }).limit(10000).lean();

  const playerIds = [...new Set(markets.filter((m) => m.subjectType === "player").map((m) => String(m.subjectId)))];
  const players = new Map((await Player.find({ _id: { $in: playerIds } }).lean()).map((p) => [String(p._id), p]));
  const teams = new Map((await Team.find().lean()).map((t) => [String(t._id), t]));
  const fixtures = new Map((await Fixture.find({ _id: { $in: [...new Set(markets.map((m) => String(m.fixtureId)))] } }).lean()).map((x) => [String(x._id), x]));

  const groups = new Map();
  for (const m of markets) {
    const key = `${m.fixtureId}:${m.subjectType}:${m.subjectId}`;
    let g = groups.get(key);
    if (!g) {
      const p = players.get(String(m.subjectId));
      const fx = fixtures.get(String(m.fixtureId));
      const team = p ? teams.get(String(p.teamId)) : null;
      const home = fx ? teams.get(String(fx.homeTeamId)) : null;
      const away = fx ? teams.get(String(fx.awayTeamId)) : null;
      g = {
        key, volumePence: 0, stats: new Map(),
        subject: p ? { id: p._id, name: p.name, position: p.position, imageUrl: p.imageUrl || null, team: team?.name || null } : { id: m.subjectId, name: "Team", position: null, imageUrl: null, team: null },
        fixture: fx ? { id: fx._id, kickoff: fx.kickoff, gameweek: fx.gameweek, home: home?.name, away: away?.name, isHome: !!(team && home && String(team._id) === String(home._id)) } : null,
      };
      groups.set(key, g);
    }
    g.volumePence += m.volumePence || 0;
    if (!g.stats.has(m.stat)) g.stats.set(m.stat, []);
    g.stats.get(m.stat).push({ marketId: m._id, line: m.line, yesPrice: lmsr.priceYes(m.q, m.b), status: m.status, resolution: m.resolution });
  }

  const order = Object.keys(STATS);
  const out = [...groups.values()]
    .map((g) => ({
      key: g.key, subject: g.subject, fixture: g.fixture, volumePence: g.volumePence,
      marketCount: [...g.stats.values()].reduce((a, l) => a + l.length, 0),
      stats: [...g.stats.entries()]
        .sort((a, b) => (order.indexOf(a[0]) + 1 || 99) - (order.indexOf(b[0]) + 1 || 99))
        .map(([stat, lines]) => ({ stat, label: STATS[stat]?.label || stat.replace(/_/g, " "), lines: lines.sort((a, b) => a.line - b.line) })),
    }))
    .sort((a, b) => new Date(a.fixture?.kickoff || 0) - new Date(b.fixture?.kickoff || 0) || a.subject.name.localeCompare(b.subject.name));
  res.json({ groups: out, total: out.length });
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
    const settled = await Market.findOne({ status: { $in: ["resolved", "void"] } }).sort({ resolvedAt: -1 }).lean();
    const last = settled || (await Fixture.findOne({ kickoff: { $lte: new Date() } }).sort({ kickoff: -1 }).lean());
    gw = last ? last.gameweek : 1;
  }
  res.json({ gameweek: gw, leaderboard: await leaderboard(gw) });
});

module.exports = router;
module.exports.view = view;
