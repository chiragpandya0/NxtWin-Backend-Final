const Settings = require("../models/Settings");

const DEFAULTS = {
  feeRate: 0.02,
  defaultB: 100,
  minProb: 0.06,
  maxProb: 0.94,
  maxAccaPayoutPence: 100000, // £1,000
  sameMatchDiscount: 0.9,
  startingBalancePence: 100000, // £1,000
  topUpBelowPence: 1000, // top-up allowed when balance < £10
  topUpToPence: 100000,
  minMinutesSample: 450,
  maxTradeShares: 5000,
  voidPostponeHours: 36,
};

let cache = null;

const getSettings = async () => {
  if (cache) return cache;
  const doc = await Settings.findOne({ key: "global" }).lean();
  cache = { ...DEFAULTS, ...(doc ? doc.values : {}) };
  return cache;
};

const updateSettings = async (patch) => {
  const bad = Object.keys(patch).filter((k) => !(k in DEFAULTS));
  if (bad.length) throw Object.assign(new Error(`Unknown settings: ${bad.join(", ")}`), { status: 400 });
  const current = await getSettings();
  const values = { ...current, ...patch };
  await Settings.findOneAndUpdate({ key: "global" }, { values }, { upsert: true });
  cache = values;
  return cache;
};

const resetSettingsCache = () => { cache = null; };

module.exports = { DEFAULTS, getSettings, updateSettings, resetSettingsCache };
