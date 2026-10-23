const ReferencePrice = require("../../models/ReferencePrice");
const { devig } = require("./devig");

// Store a de-vigged reference price for a market. Source: "betfair" | "oddsapi".
// Adapters for the Betfair Exchange API and The Odds API call this once credentials exist.
const logReference = async (marketId, source, overOdds, underOdds, raw) =>
  ReferencePrice.create({ marketId, source, pYes: devig(overOdds, underOdds), raw });

module.exports = { logReference };
