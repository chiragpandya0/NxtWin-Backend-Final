// Player/team stat model: P(stat > line) from Poisson or negative binomial.

const logFactorial = (n) => {
  let s = 0;
  for (let i = 2; i <= n; i++) s += Math.log(i);
  return s;
};

const poissonPmf = (k, lambda) =>
  Math.exp(-lambda + k * Math.log(lambda) - logFactorial(k));

// Negative binomial parameterised by mean and dispersion r (variance = mean + mean²/r).
const negbinPmf = (k, mean, r) => {
  const p = r / (r + mean);
  const lg = (x) => logFactorial(x - 1); // lgamma for integer-valued r only
  const logC = Number.isInteger(r)
    ? lg(k + r) - logFactorial(k) - lg(r)
    : gammaln(k + r) - logFactorial(k) - gammaln(r);
  return Math.exp(logC + r * Math.log(p) + k * Math.log(1 - p));
};

// Lanczos approximation for non-integer dispersion.
function gammaln(x) {
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) ser += c[j] / ++y;
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}

// P(X > line) where line is e.g. 2.5 → P(X >= 3).
const probOver = (line, mean, dispersion) => {
  const threshold = Math.floor(line); // X > 2.5 ⇔ X > 2
  let cdf = 0;
  for (let k = 0; k <= threshold; k++) {
    cdf += dispersion ? negbinPmf(k, mean, dispersion) : poissonPmf(k, mean);
  }
  return Math.min(1, Math.max(0, 1 - cdf));
};

// Expected count for a match.
const expectedMean = ({ per90, expectedMinutes, opponentFactor = 1, homeAwayFactor = 1 }) =>
  per90 * (expectedMinutes / 90) * opponentFactor * homeAwayFactor;

// Offer a line only if the probability is inside the band and the data is reliable.
const isOfferable = (p, { minProb = 0.06, maxProb = 0.94 } = {}) =>
  p >= minProb && p <= maxProb;

module.exports = { probOver, expectedMean, isOfferable };
