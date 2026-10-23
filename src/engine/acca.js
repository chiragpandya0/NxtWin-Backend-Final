// Accumulator pricing. Combined probability is the product of leg probabilities; the payout
// is discounted by `sameMatchDiscount` for each extra leg from the same match.

const combinedProbability = (legs) => legs.reduce((p, l) => p * l.p, 1);

const sameMatchFactor = (legs, discount) => {
  const byFixture = new Map();
  for (const l of legs) byFixture.set(l.fixtureId, (byFixture.get(l.fixtureId) || 0) + 1);
  let f = 1;
  for (const k of byFixture.values()) f *= Math.pow(discount, k - 1);
  return f;
};

// stakePence is the amount that goes into the entry (after the single fee is taken).
const quote = (legs, stakePence, { sameMatchDiscount = 0.9, maxPayoutPence }) => {
  const p = combinedProbability(legs);
  const raw = (stakePence / p) * sameMatchFactor(legs, sameMatchDiscount);
  const payoutPence = Math.min(Math.floor(raw), maxPayoutPence);
  return { combinedP: p, payoutPence, capped: raw > maxPayoutPence };
};

// Sell-back value: locked payout x current combined price, less the fee.
const sellBackValue = (lockedPayoutPence, currentLegs, feeRate) => {
  const p = combinedProbability(currentLegs);
  return Math.floor(lockedPayoutPence * p * (1 - feeRate));
};

module.exports = { combinedProbability, sameMatchFactor, quote, sellBackValue };
