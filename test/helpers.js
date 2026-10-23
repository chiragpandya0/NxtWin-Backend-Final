process.env.NODE_ENV = "test";
const mongoose = require("mongoose");
const { MongoMemoryReplSet } = require("mongodb-memory-server");

let repl;
const start = async () => {
  repl = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(repl.getUri(), { dbName: "test" });
  // Transactions need collections (and unique indexes) to exist up front.
  for (const m of Object.values(mongoose.models)) { await m.createCollection().catch(() => {}); await m.syncIndexes(); }
};
const stop = async () => { await mongoose.disconnect(); await repl.stop(); };
const reset = async () => {
  for (const m of Object.values(mongoose.models)) await m.deleteMany({});
  require("../src/config/settings").resetSettingsCache();
};

const M = (n) => require(`../src/models/${n}`);

// A fixture kicking off in the future with one player and a ladder of lines.
const seedWorld = async ({ lines = [0.5, 1.5, 2.5], p = [0.7, 0.4, 0.15], kickoffInMs = 3600e3, b = 100 } = {}) => {
  const lmsr = require("../src/engine/lmsr");
  const home = await M("Team").create({ name: "Home FC" });
  const away = await M("Team").create({ name: "Away FC" });
  const player = await M("Player").create({ name: "Test Striker", teamId: home._id, per90: { shots: 3 }, minutesSample: 900 });
  const fixture = await M("Fixture").create({ homeTeamId: home._id, awayTeamId: away._id, kickoff: new Date(Date.now() + kickoffInMs), gameweek: 1 });
  const markets = [];
  for (let i = 0; i < lines.length; i++) {
    markets.push(await M("Market").create({
      fixtureId: fixture._id, subjectType: "player", subjectId: player._id, stat: "shots", line: lines[i],
      title: `Test Striker shots over ${lines[i]}`, b, openProb: p[i], modelProb: p[i], q: lmsr.seed(p[i], b),
      status: "open", kickoff: fixture.kickoff, gameweek: 1,
    }));
  }
  return { home, away, player, fixture, markets };
};

const makeUser = async (email, balancePence = 100000) => {
  const { withTx } = require("../src/config/db");
  const ledger = require("../src/services/ledger");
  return withTx(async (session) => {
    const [u] = await M("User").create([{ email, passwordHash: "x", name: email, dob: new Date("1990-01-01") }], { session });
    await ledger.post(session, { userId: u._id, amountPence: balancePence, type: "signup_grant", key: `signup:${u._id}` });
    return M("User").findById(u._id).session(session);
  });
};

module.exports = { start, stop, reset, seedWorld, makeUser, M };
