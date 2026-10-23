// Demo seed for recording a walkthrough. Creates ONE match (Arsenal v Manchester City, gameweek 99) with
// a small set of markets, three demo users and a few pre-placed trades. Safe to re-run: it resets
// everything it created before (only gameweek 99 and the @demo.test users).
// Usage: node scripts/seed-demo.js            (create / reset the demo)
//        node scripts/seed-demo.js --cleanup  (remove the demo match and demo users, nothing else)
require("../src/config/env");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { connectDB, withTx } = require("../src/config/db");
const Team = require("../src/models/Team");
const Player = require("../src/models/Player");
const Fixture = require("../src/models/Fixture");
const Market = require("../src/models/Market");
const MatchStat = require("../src/models/MatchStat");
const Position = require("../src/models/Position");
const Trade = require("../src/models/Trade");
const PriceSnapshot = require("../src/models/PriceSnapshot");
const Accumulator = require("../src/models/Accumulator");
const User = require("../src/models/User");
const LedgerEntry = require("../src/models/LedgerEntry");
const marketGen = require("../src/services/marketGen");
const trading = require("../src/services/trading");
const wallet = require("../src/services/wallet");
const lmsr = require("../src/engine/lmsr");

const GAMEWEEK = 99;
const PASSWORD = "demo-pass-123";
const USERS = [
  ["alice@demo.test", "Alice"],
  ["bob@demo.test", "Bob"],
  ["cara@demo.test", "Cara"],
];
// name, team, position, per-90 shots, per-90 goals
const PLAYERS = [
  ["Bukayo Saka", "Arsenal", "MID", 3.0, 0.4],
  ["Kai Havertz", "Arsenal", "FWD", 2.4, 0.35],
  ["Erling Haaland", "Manchester City", "FWD", 3.8, 0.9],
  ["Phil Foden", "Manchester City", "MID", 2.7, 0.35],
];

const reset = async () => {
  const fixtures = await Fixture.find({ gameweek: GAMEWEEK }, "_id").lean();
  const markets = await Market.find({ fixtureId: { $in: fixtures.map((f) => f._id) } }, "_id").lean();
  const mIds = markets.map((m) => m._id);
  const users = await User.find({ email: { $in: USERS.map((u) => u[0]) } }, "_id").lean();
  const uIds = users.map((u) => u._id);
  await Promise.all([
    Position.deleteMany({ marketId: { $in: mIds } }), Trade.deleteMany({ marketId: { $in: mIds } }),
    PriceSnapshot.deleteMany({ marketId: { $in: mIds } }), Market.deleteMany({ _id: { $in: mIds } }),
    MatchStat.deleteMany({ fixtureId: { $in: fixtures.map((f) => f._id) } }), Fixture.deleteMany({ gameweek: GAMEWEEK }),
    Accumulator.deleteMany({ userId: { $in: uIds } }), LedgerEntry.deleteMany({ userId: { $in: uIds } }), User.deleteMany({ _id: { $in: uIds } }),
  ]);
};

(async () => {
  await connectDB();
  await reset();
  if (process.argv.includes("--cleanup")) { console.log("Demo data removed."); await mongoose.disconnect(); return; }

  const arsenal = await Team.findOneAndUpdate({ name: "Arsenal" }, { name: "Arsenal", attackFactor: 1.15, defenceFactor: 0.85 }, { upsert: true, new: true });
  const city = await Team.findOneAndUpdate({ name: "Manchester City" }, { name: "Manchester City", attackFactor: 1.2, defenceFactor: 0.85 }, { upsert: true, new: true });
  const teamId = { Arsenal: arsenal._id, "Manchester City": city._id };

  const players = {};
  for (const [name, team, position, shots, goals] of PLAYERS) {
    players[name] = await Player.findOneAndUpdate({ name }, {
      name, teamId: teamId[team], position, minutesSample: 1800, expectedMinutes: position === "FWD" ? 80 : 85,
      $set: { "per90.shots": shots, "per90.goals": goals },
    }, { upsert: true, new: true });
  }

  const kickoff = new Date(Date.now() + 2 * 864e5); kickoff.setHours(15, 0, 0, 0);
  const fixture = await Fixture.create({ homeTeamId: arsenal._id, awayTeamId: city._id, kickoff, gameweek: GAMEWEEK });
  await marketGen.generateForFixture(fixture._id, { stats: ["shots", "goals"], playerIds: Object.values(players).map((p) => p._id) });
  await marketGen.openMarkets({ fixtureId: fixture._id });

  const users = {};
  for (const [email, name] of USERS) {
    await withTx(async (session) => {
      const [u] = await User.create([{ email, passwordHash: await bcrypt.hash(PASSWORD, 10), name, dob: new Date("1990-01-01") }], { session });
      await wallet.signupGrant(session, u);
      users[name] = u;
    });
  }

  const find = async (player, stat, line) =>
    Market.findOne({ fixtureId: fixture._id, subjectId: players[player]._id, stat, line });
  const buy = async (who, player, stat, line, side, shares) =>
    trading.execute(users[who]._id, { marketId: (await find(player, stat, line))._id, side, action: "buy", shares });

  // Pre-placed activity so the charts and volume are not empty
  await buy("Bob", "Erling Haaland", "goals", 0.5, "yes", 60);
  await buy("Bob", "Erling Haaland", "shots", 2.5, "yes", 40);
  await buy("Cara", "Bukayo Saka", "goals", 0.5, "no", 40);
  await buy("Cara", "Phil Foden", "shots", 1.5, "yes", 30);

  const markets = await Market.find({ fixtureId: fixture._id }).sort({ title: 1, line: 1 });
  console.log(`\nDemo ready: Arsenal v Manchester City (gameweek ${GAMEWEEK}), kick-off ${kickoff.toLocaleString()}`);
  console.log(`Users (password ${PASSWORD}): ${USERS.map((u) => u[0]).join(", ")}\n`);
  for (const m of markets) console.log(`  ${m.title.padEnd(40)} YES ${(lmsr.priceYes(m.q, m.b) * 100).toFixed(0)}p`);
  console.log(`\n${markets.length} markets. See docs/DEMO.md for the script and the results to enter.`);
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
