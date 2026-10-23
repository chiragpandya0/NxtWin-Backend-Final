// Binary LMSR market maker. Shares pay £1 (100p) if they win; prices are probabilities.
// q = { yes, no } are outstanding share counts; b is the liquidity parameter.

const logSumExp = (a, b) => {
  const m = Math.max(a, b);
  return m + Math.log(Math.exp(a - m) + Math.exp(b - m));
};

// Cost function in pounds.
const cost = (q, b) => b * logSumExp(q.yes / b, q.no / b);

// Probability of YES.
const priceYes = (q, b) => 1 / (1 + Math.exp((q.no - q.yes) / b));

const priceOf = (q, b, side) => {
  const p = priceYes(q, b);
  return side === "yes" ? p : 1 - p;
};

// Seed state so that the opening YES price equals p (0 < p < 1).
const seed = (p, b) => ({ yes: b * Math.log(p / (1 - p)), no: 0 });

const add = (q, side, n) => ({
  yes: q.yes + (side === "yes" ? n : 0),
  no: q.no + (side === "no" ? n : 0),
});

// Pounds (before fee) to buy n shares of `side`.
const buyCost = (q, b, side, n) => cost(add(q, side, n), b) - cost(q, b);

// Pounds (before fee) received for selling n shares of `side`.
const sellProceeds = (q, b, side, n) => cost(q, b) - cost(add(q, side, -n), b);

// Shares obtainable for a pound spend (before fee), closed form.
// Solve C(q + n·e_side) - C(q) = spend for n.
const sharesForSpend = (q, b, side, spend) => {
  const own = side === "yes" ? q.yes : q.no;
  const other = side === "yes" ? q.no : q.yes;
  const c = cost(q, b);
  const target = (c + spend) / b; // = ln(e^{(own+n)/b} + e^{other/b})
  const eOther = Math.exp(other / b - target);
  const x = 1 - eOther; // = e^{(own+n)/b - target}
  if (x <= 0) return 0;
  return b * (target + Math.log(x)) - own;
};

// Worst-case house loss at the opening price p: b·ln(1/p) for the winning outcome.
const maxLoss = (b, p) => b * Math.log(1 / p);

module.exports = {
  cost, priceYes, priceOf, seed, add, buyCost, sellProceeds, sharesForSpend, maxLoss,
};
