const test = require("node:test");
const { after } = test;
const assert = require("node:assert");
const H = require("./helpers");

(async () => {
  await H.start();
  const trading = require("../src/services/trading");
  const accas = require("../src/services/accumulators");
  const settlement = require("../src/services/settlement");
  const reports = require("../src/services/reports");
  const { M } = H;
  let n = 0;
  const email = () => `u${++n}@t.com`;
  const bal = async (u) => (await M("User").findById(u._id)).balancePence;
  const trade = (u, m, side, action, shares, extra = {}) =>
    trading.execute(u._id, { marketId: m._id, side, action, shares, ...extra });

  test("buy then sell: balance, position and ledger agree", async () => {
    await H.reset();
    const { markets } = await H.seedWorld();
    const u = await H.makeUser(email());
    const buy = await trade(u, markets[0], "yes", "buy", 20);
    assert.strictEqual(await bal(u), 100000 - buy.netPence);
    const sell = await trade(u, markets[0], "yes", "sell", 20);
    assert.ok(sell.netPence < buy.netPence, "round trip loses only the fee and rounding");
    assert.ok(buy.netPence - sell.netPence < 80);
    assert.strictEqual((await reports.reconcile()).ok, true);
  });

  test("spend-based buy never exceeds the spend", async () => {
    await H.reset();
    const { markets } = await H.seedWorld();
    const u = await H.makeUser(email());
    for (const spend of [100, 333, 1000, 2500]) {
      const r = await trading.execute(u._id, { marketId: markets[0]._id, side: "yes", action: "buy", spendPence: spend });
      assert.ok(r.netPence <= spend && r.netPence > spend - 40, `${r.netPence} vs ${spend}`);
    }
  });

  test("cannot sell shares you do not hold or buy beyond balance", async () => {
    await H.reset();
    const { markets } = await H.seedWorld();
    const u = await H.makeUser(email(), 500);
    await assert.rejects(trade(u, markets[0], "yes", "sell", 5), /do not hold/);
    await assert.rejects(trade(u, markets[0], "yes", "buy", 100), /Insufficient/);
    assert.strictEqual(await bal(u), 500);
  });

  test("concurrent buys cannot overspend", async () => {
    await H.reset();
    const { markets } = await H.seedWorld();
    const u = await H.makeUser(email(), 1500);
    const results = await Promise.allSettled(Array.from({ length: 8 }, () => trade(u, markets[1], "yes", "buy", 10)));
    const ok = results.filter((r) => r.status === "fulfilled").length;
    assert.ok(ok >= 1 && ok < 8);
    assert.ok((await bal(u)) >= 0);
    assert.strictEqual((await reports.reconcile()).ok, true);
  });

  test("ladder stays ordered after a heavy buy on a higher line", async () => {
    await H.reset();
    const { markets } = await H.seedWorld();
    const u = await H.makeUser(email(), 1e7);
    await trade(u, markets[2], "yes", "buy", 400); // push P(over 2.5) well above P(over 1.5)
    const lmsr = require("../src/engine/lmsr");
    const ms = await M("Market").find({ fixtureId: markets[0].fixtureId }).sort({ line: 1 });
    const ps = ms.map((m) => lmsr.priceYes(m.q, m.b));
    assert.ok(ps[0] >= ps[1] - 1e-9 && ps[1] >= ps[2] - 1e-9, JSON.stringify(ps));
  });

  test("closed market rejects trades", async () => {
    await H.reset();
    const { markets } = await H.seedWorld({ kickoffInMs: -1000 });
    const u = await H.makeUser(email());
    await assert.rejects(trade(u, markets[0], "yes", "buy", 1), /closed|not open/i);
  });

  test("settlement pays winners once, re-run is a no-op, correction reverses", async () => {
    await H.reset();
    const { markets } = await H.seedWorld();
    const a = await H.makeUser(email());
    const b = await H.makeUser(email());
    await trade(a, markets[0], "yes", "buy", 50);
    await trade(b, markets[0], "no", "buy", 50);
    const aBefore = await bal(a), bBefore = await bal(b);

    await settlement.settleMarket(markets[0]._id, "yes");
    assert.strictEqual(await bal(a), aBefore + 5000);
    assert.strictEqual(await bal(b), bBefore);

    const again = await settlement.settleMarket(markets[0]._id, "yes");
    assert.ok(again.noop);
    assert.strictEqual(await bal(a), aBefore + 5000);

    await settlement.settleMarket(markets[0]._id, "no"); // correction
    assert.strictEqual(await bal(a), aBefore);
    assert.strictEqual(await bal(b), bBefore + 5000);
    assert.strictEqual((await reports.reconcile()).ok, true);
  });

  test("void refunds net cost", async () => {
    await H.reset();
    const { markets } = await H.seedWorld();
    const u = await H.makeUser(email());
    await trade(u, markets[0], "yes", "buy", 30);
    await trade(u, markets[0], "yes", "sell", 10);
    const pos = await M("Position").findOne({ userId: u._id });
    const before = await bal(u);
    await settlement.settleMarket(markets[0]._id, "void");
    assert.strictEqual(await bal(u), before + pos.costPence);
    assert.strictEqual((await reports.reconcile()).ok, true);
  });

  test("accumulator wins, loses, and reprices around a void leg", async () => {
    await H.reset();
    const w = await H.seedWorld();
    const w2 = await (async () => {
      const f2 = await M("Fixture").create({ homeTeamId: w.home._id, awayTeamId: w.away._id, kickoff: new Date(Date.now() + 7200e3), gameweek: 1 });
      const lmsr = require("../src/engine/lmsr");
      return M("Market").create({ fixtureId: f2._id, subjectType: "player", subjectId: w.player._id, stat: "shots", line: 0.5,
        title: "F2 shots over 0.5", b: 100, openProb: 0.6, modelProb: 0.6, q: lmsr.seed(0.6, 100), status: "open", kickoff: f2.kickoff, gameweek: 1 });
    })();
    const u = await H.makeUser(email());
    const quote = await accas.quote({ legs: [{ marketId: w.markets[0]._id, side: "yes" }, { marketId: w2._id, side: "yes" }], stakePence: 1000 });
    assert.ok(quote.payoutPence > 1000);
    const { accumulator } = await accas.place(u._id, { legs: [{ marketId: w.markets[0]._id, side: "yes" }, { marketId: w2._id, side: "yes" }], stakePence: 1000 });
    assert.strictEqual(await bal(u), 100000 - 1000);

    await settlement.settleMarket(w.markets[0]._id, "void");
    await settlement.settleMarket(w2._id, "yes");
    const a = await M("Accumulator").findById(accumulator._id);
    assert.strictEqual(a.status, "won");
    // Void leg dropped: priced on the single remaining leg at its locked price.
    assert.ok(a.settledPayoutPence > 0 && a.settledPayoutPence < quote.payoutPence);
    assert.strictEqual(await bal(u), 100000 - 1000 + a.settledPayoutPence);
    await settlement.settleMarket(w2._id, "yes"); // re-run pays nothing extra
    assert.strictEqual(await bal(u), 100000 - 1000 + a.settledPayoutPence);

    await settlement.settleMarket(w2._id, "no"); // correction: now lost
    assert.strictEqual((await M("Accumulator").findById(accumulator._id)).status, "lost");
    assert.strictEqual(await bal(u), 100000 - 1000);
    assert.strictEqual((await reports.reconcile()).ok, true);
  });

  test("accumulator sell-back and all-void refund", async () => {
    await H.reset();
    const w = await H.seedWorld();
    const u = await H.makeUser(email());
    const legs = [{ marketId: w.markets[0]._id, side: "yes" }, { marketId: w.markets[1]._id, side: "no" }];
    const { accumulator } = await accas.place(u._id, { legs, stakePence: 2000 });
    const sold = await accas.sellBack(u._id, accumulator._id);
    assert.ok(sold.valuePence > 0 && sold.valuePence < 2000);
    const { accumulator: a2 } = await accas.place(u._id, { legs, stakePence: 2000 });
    const before = await bal(u);
    await settlement.settleMarket(w.markets[0]._id, "void");
    await settlement.settleMarket(w.markets[1]._id, "void");
    assert.strictEqual(await bal(u), before + 2000);
    assert.strictEqual((await M("Accumulator").findById(a2._id)).status, "void");
    assert.strictEqual((await reports.reconcile()).ok, true);
  });

  test("results-driven settlement: DNP voids, otherwise over/under the line", async () => {
    await H.reset();
    const w = await H.seedWorld();
    const u = await H.makeUser(email());
    await trade(u, w.markets[0], "yes", "buy", 10);
    await trade(u, w.markets[2], "yes", "buy", 10);
    await M("MatchStat").create({ fixtureId: w.fixture._id, subjectType: "player", subjectId: w.player._id, minutes: 90, stats: { shots: 2 } });
    await M("Fixture").updateOne({ _id: w.fixture._id }, { status: "finished" });
    const r = await settlement.settleFixture(w.fixture._id);
    assert.strictEqual(r.settled, 3);
    const byLine = Object.fromEntries((await M("Market").find({ fixtureId: w.fixture._id })).map((m) => [m.line, m.resolution]));
    assert.deepStrictEqual(byLine, { 0.5: "yes", 1.5: "yes", 2.5: "no" });
    await H.reset();
    const w2 = await H.seedWorld();
    await M("Fixture").updateOne({ _id: w2.fixture._id }, { status: "finished" });
    await settlement.settleFixture(w2.fixture._id);
    assert.ok((await M("Market").find()).every((m) => m.resolution === "void"));
  });

  test("randomised simulation keeps ledger and balances reconciled and house loss bounded", async () => {
    await H.reset();
    const w = await H.seedWorld();
    const users = await Promise.all(Array.from({ length: 6 }, () => H.makeUser(email())));
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 120; i++) {
      const u = users[Math.floor(rnd() * users.length)];
      const m = w.markets[Math.floor(rnd() * 3)];
      const side = rnd() < 0.5 ? "yes" : "no";
      const action = rnd() < 0.7 ? "buy" : "sell";
      await trade(u, m, side, action, 1 + Math.floor(rnd() * 40)).catch(() => {});
    }
    assert.strictEqual((await reports.reconcile()).ok, true);
    for (const m of await M("Market").find()) await settlement.settleMarket(m._id, rnd() < 0.5 ? "yes" : "no");
    assert.strictEqual((await reports.reconcile()).ok, true);
    const total = (await M("User").find()).reduce((a, u) => a + u.balancePence, 0);
    // House P&L = what users hold now vs what they were granted; bounded by the sum of max-loss bounds (plus ladder shifts).
    const lmsr = require("../src/engine/lmsr");
    const bound = w.markets.reduce((a, m) => a + lmsr.maxLoss(m.b, m.openProb) * 100, 0);
    assert.ok(total - 6 * 100000 <= bound * 3, `house lost ${total - 600000}p vs bound ${bound}p`);
  });

  test("auth: age gate, login, admin role gating", async () => {
    await H.reset();
    const http = require("http");
    const fetch = require("node-fetch");
    const { createApp } = require("../index");
    const server = http.createServer(createApp());
    await new Promise((r) => server.listen(0, r));
    const base = `http://127.0.0.1:${server.address().port}`;
    const post = (p, body, token) => fetch(base + p, { method: "POST", headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
    const young = await post("/api/auth/signup", { email: "kid@t.com", password: "password1", name: "Kid", dob: new Date(Date.now() - 17 * 365 * 864e5).toISOString() });
    assert.strictEqual(young.status, 403);
    const ok = await post("/api/auth/signup", { email: "adult@t.com", password: "password1", name: "Adult", dob: "1990-05-05" });
    assert.strictEqual(ok.status, 201);
    const { token, user } = await ok.json();
    assert.strictEqual(user.balancePence, 100000);
    assert.strictEqual((await post("/api/auth/login", { email: "adult@t.com", password: "wrong" })).status, 401);
    assert.strictEqual((await fetch(base + "/api/portfolio")).status, 401);
    assert.strictEqual((await fetch(base + "/api/portfolio", { headers: { authorization: `Bearer ${token}` } })).status, 200);
    assert.strictEqual((await fetch(base + "/api/admin/settings", { headers: { authorization: `Bearer ${token}` } })).status, 403);
    assert.strictEqual((await post("/api/trade/execute", { marketId: "a".repeat(24), side: "yes", action: "buy", shares: 1 }, token)).status, 404);
    await new Promise((r) => server.close(r));
  });
  after(async () => { await H.stop(); process.exit(process.exitCode || 0); });
})();
