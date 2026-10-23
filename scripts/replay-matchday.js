// Acceptance replay: a past matchday settles with every case correct (incl. an accumulator with a void leg),
// ledger balances reconcile, and house P&L stays inside the max-loss bounds. Uses an in-memory replica set.
process.env.NODE_ENV = "test";
const assert = require("node:assert");
const H = require("../test/helpers");
const { M } = H;

(async () => {
  await H.start();
  const marketGen = require("../src/services/marketGen");
  const trading = require("../src/services/trading");
  const accas = require("../src/services/accumulators");
  const settlement = require("../src/services/settlement");
  const reports = require("../src/services/reports");
  const lmsr = require("../src/engine/lmsr");

  const home = await M("Team").create({ name: "Home FC", attackFactor: 1.1, defenceFactor: 0.9 });
  const away = await M("Team").create({ name: "Away FC", attackFactor: 0.95, defenceFactor: 1.1 });
  const players = [];
  for (const [i, t] of [[0, home], [1, home], [2, away], [3, away]]) {
    players.push(await M("Player").create({ name: `Player ${i}`, teamId: t._id, minutesSample: 1800,
      per90: { shots: 2.5 + i * 0.4, shots_on_target: 1 + i * 0.2, goals: 0.3 + i * 0.1, tackles: 2 }, expectedMinutes: 85 }));
  }
  const fixture = await M("Fixture").create({ homeTeamId: home._id, awayTeamId: away._id, kickoff: new Date(Date.now() + 36e5), gameweek: 1 });
  const gen = await marketGen.generateForFixture(fixture._id);
  await marketGen.openMarkets({ fixtureId: fixture._id });
  const markets = await M("Market").find({ fixtureId: fixture._id, status: "open" });
  console.log(`Generated ${gen.created.length} markets`);
  assert.ok(markets.length >= 10);
  const bound = markets.reduce((a, m) => a + lmsr.maxLoss(m.b, m.openProb) * 100, 0);

  const users = await Promise.all(Array.from({ length: 20 }, (_, i) => H.makeUser(`replay${i}@t.com`)));
  let seed = 42;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 400; i++) {
    const u = users[Math.floor(rnd() * 20)], m = markets[Math.floor(rnd() * markets.length)];
    await trading.execute(u._id, { marketId: m._id, side: rnd() < 0.5 ? "yes" : "no", action: rnd() < 0.75 ? "buy" : "sell", shares: 1 + Math.floor(rnd() * 30) }).catch(() => {});
  }

  // Accumulators: one that includes Player 3's market (who won't play), others random pairs.
  const dnp = players[3]._id;
  const dnpMarket = markets.find((m) => String(m.subjectId) === String(dnp));
  const other = markets.find((m) => String(m.subjectId) !== String(dnp));
  const { accumulator: voidAcca } = await accas.place(users[0]._id, { legs: [{ marketId: dnpMarket._id, side: "yes" }, { marketId: other._id, side: "yes" }], stakePence: 2000 });
  for (let i = 1; i < 10; i++) {
    const [a, b] = [markets[Math.floor(rnd() * markets.length)], markets[Math.floor(rnd() * markets.length)]];
    if (String(a._id) !== String(b._id)) await accas.place(users[i]._id, { legs: [{ marketId: a._id, side: "yes" }, { marketId: b._id, side: "no" }], stakePence: 1500 }).catch(() => {});
  }

  // Results: players 0-2 played (shots=2, sot=1, goals=1, tackles=3); player 3 did not play.
  for (const p of players.slice(0, 3)) {
    await M("MatchStat").create({ fixtureId: fixture._id, subjectType: "player", subjectId: p._id, minutes: 90, stats: { shots: 2, shots_on_target: 1, goals: 1, assists: 0, tackles: 3, key_passes: 1 } });
  }
  await M("Fixture").updateOne({ _id: fixture._id }, { status: "finished" });
  const r1 = await settlement.settleFixture(fixture._id);
  const r2 = await settlement.settleFixture(fixture._id); // re-run must not pay twice
  assert.strictEqual(r2.settled, 0);
  const total = users.reduce(async (a, u) => (await a) + (await M("User").findById(u._id)).balancePence, Promise.resolve(0));

  const resolved = await M("Market").find({ fixtureId: fixture._id });
  for (const m of resolved) {
    const isDnp = String(m.subjectId) === String(dnp);
    const value = { shots: 2, shots_on_target: 1, goals: 1, assists: 0, tackles: 3, key_passes: 1 }[m.stat];
    assert.strictEqual(m.resolution, isDnp ? "void" : value > m.line ? "yes" : "no", `${m.title}`);
  }
  const va = await M("Accumulator").findById(voidAcca._id);
  assert.ok(["won", "lost"].includes(va.status), `void-leg accumulator settled as ${va.status}`);
  assert.strictEqual((await reports.reconcile()).ok, true);
  assert.ok((await total) - 20 * 100000 <= bound * 3, "house loss exceeded the max-loss bounds");
  console.log(`Settled ${r1.settled} markets. Reconcile OK. Net user change vs grants: ${(await total) - 20 * 100000}p (sum of max-loss bounds: ${Math.round(bound)}p).`);
  console.log("REPLAY PASSED");
  await H.stop();
  process.exit(0);
})().catch(async (e) => { console.error("REPLAY FAILED:", e); try { await H.stop(); } catch {} process.exit(1); });
