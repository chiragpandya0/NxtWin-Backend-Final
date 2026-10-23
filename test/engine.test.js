const test = require("node:test");
const assert = require("node:assert");
const L = require("../src/engine/lmsr");
const M = require("../src/engine/model");
const { repairLadder } = require("../src/engine/ladder");
const A = require("../src/engine/acca");

const near = (a, b, tol = 0.01) => assert.ok(Math.abs(a - b) <= tol, `${a} !~ ${b}`);

test("seed opens at the model probability", () => {
  near(L.priceYes(L.seed(0.46, 100), 100), 0.46, 1e-9);
});

test("proposal worked example: b=100, p=0.46", () => {
  const b = 100;
  let q = L.seed(0.46, b);
  const c1 = L.buyCost(q, b, "yes", 20);
  near(c1, 9.7, 0.05);
  q = L.add(q, "yes", 20);
  near(L.priceYes(q, b), 0.51, 0.005);
  const c2 = L.buyCost(q, b, "no", 20);
  near(c2, 10.3, 0.05);
  q = L.add(q, "no", 20);
  near(L.priceYes(q, b), 0.46, 1e-9);
  near(c1 + c2, 20, 1e-9); // house collected £20, owes £20 either way
});

test("max loss bound holds for one-sided flow", () => {
  const b = 100, p = 0.46;
  let q = L.seed(0.46, b);
  const start = L.cost(q, b);
  for (let i = 0; i < 200; i++) q = L.add(q, "yes", 10);
  const collected = L.cost(q, b) - start;
  const owed = q.yes - L.seed(p, b).yes; // YES shares sold, each pays £1
  assert.ok(owed - collected <= L.maxLoss(b, p) + 1e-6);
  near(L.maxLoss(b, p), 77.6, 0.1); // "about £78"
});

test("buy then sell round trip returns the same cost", () => {
  const b = 100, q = L.seed(0.3, b);
  const paid = L.buyCost(q, b, "yes", 37);
  const back = L.sellProceeds(L.add(q, "yes", 37), b, "yes", 37);
  near(paid, back, 1e-9);
});

test("sharesForSpend inverts buyCost", () => {
  const b = 100, q = L.seed(0.55, b);
  for (const side of ["yes", "no"]) {
    const n = L.sharesForSpend(q, b, side, 12.34);
    near(L.buyCost(q, b, side, n), 12.34, 1e-6);
  }
});

test("numerically stable at extreme state", () => {
  const q = { yes: 1e5, no: 0 };
  assert.ok(Number.isFinite(L.cost(q, 100)));
  near(L.priceYes(q, 100), 1, 1e-9);
});

test("Poisson tail and probability band", () => {
  near(M.probOver(0.5, 1), 1 - Math.exp(-1), 1e-9);
  near(M.probOver(1.5, 2), 1 - Math.exp(-2) * (1 + 2), 1e-9);
  assert.ok(!M.isOfferable(0.03));
  assert.ok(M.isOfferable(0.5));
  assert.ok(!M.isOfferable(0.95));
});

test("negative binomial is more dispersed than Poisson", () => {
  assert.ok(M.probOver(4.5, 2, 2) > M.probOver(4.5, 2));
  near(M.probOver(0.5, 2, 1e6), M.probOver(0.5, 2), 1e-3); // r→∞ tends to Poisson
});

test("ladder repair restores order minimally", () => {
  const out = repairLadder([
    { id: "a", line: 3.5, p: 0.6 },
    { id: "b", line: 4.5, p: 0.65 },
    { id: "c", line: 5.5, p: 0.2 },
  ]);
  assert.deepStrictEqual(out.map((r) => [r.id, r.to]), [["b", 0.6]]);
});

test("ladder repair pinned at the traded rung moves the others", () => {
  const out = repairLadder([
    { id: "a", line: 3.5, p: 0.5 },
    { id: "b", line: 4.5, p: 0.7 }, // just traded up
    { id: "c", line: 5.5, p: 0.3 },
  ], { pinned: "b" });
  assert.deepStrictEqual(out.map((r) => [r.id, r.to]), [["a", 0.7]]);
});

test("accumulator pricing, same-match discount and cap", () => {
  const legs = [
    { p: 0.5, fixtureId: "f1" },
    { p: 0.5, fixtureId: "f2" },
  ];
  const q = A.quote(legs, 1000, { sameMatchDiscount: 0.9, maxPayoutPence: 1e6 });
  assert.strictEqual(q.payoutPence, 4000);
  const same = A.quote([{ p: 0.5, fixtureId: "f1" }, { p: 0.5, fixtureId: "f1" }], 1000, { sameMatchDiscount: 0.9, maxPayoutPence: 1e6 });
  assert.strictEqual(same.payoutPence, 3600);
  const cap = A.quote(legs, 1000, { maxPayoutPence: 2500 });
  assert.strictEqual(cap.payoutPence, 2500);
  assert.ok(cap.capped);
});
