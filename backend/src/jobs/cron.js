const cron = require("node-cron");
const Market = require("../models/Market");
const Fixture = require("../models/Fixture");
const settlement = require("../services/settlement");
const reports = require("../services/reports");
const socket = require("../services/socket");

// Close open markets at kickoff.
const closeAtKickoff = async () => {
  const due = await Market.find({ status: "open", kickoff: { $lte: new Date() } }, "_id").lean();
  if (!due.length) return 0;
  await Market.updateMany({ _id: { $in: due.map((m) => m._id) } }, { status: "closed" });
  due.forEach((m) => socket.emitMarketStatus(m._id, "closed"));
  return due.length;
};

// Settle finished (or long-postponed) fixtures that still have undecided markets.
const settleDue = async () => {
  const fixtureIds = await Market.distinct("fixtureId", { status: { $in: ["open", "suspended", "closed"] } });
  const fixtures = await Fixture.find({ _id: { $in: fixtureIds }, status: { $in: ["finished", "postponed"] } }, "_id").lean();
  for (const f of fixtures) await settlement.settleFixture(f._id);
};

const start = () => {
  const safe = (name, fn) => async () => { try { await fn(); } catch (e) { console.error(`[cron:${name}]`, e.message); } };
  cron.schedule("* * * * *", safe("close", closeAtKickoff));
  cron.schedule("*/10 * * * *", safe("settle", settleDue));
  cron.schedule("0 3 * * *", safe("reconcile", async () => {
    const r = await reports.reconcile();
    if (!r.ok) console.error("[reconcile] DRIFT", JSON.stringify(r.drift));
    else console.log(`[reconcile] ok (${r.checked} users)`);
  }));
};

module.exports = { start, closeAtKickoff, settleDue };
