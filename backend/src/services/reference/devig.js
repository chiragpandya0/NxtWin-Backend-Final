// Remove the bookmaker margin from a two-way price by proportional normalisation.
const devig = (overOdds, underOdds) => {
  const a = 1 / overOdds;
  const b = 1 / underOdds;
  return a / (a + b);
};
module.exports = { devig };
