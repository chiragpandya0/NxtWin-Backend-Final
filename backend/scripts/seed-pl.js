// Seeds a demo Premier League gameweek: teams, players (per-90 rates), fixtures, model-priced markets, and an admin.
// Usage: node scripts/seed-pl.js   (needs MONGODB_URI; set ADMIN_EMAIL + ADMIN_PASSWORD to create the admin)
require("../src/config/env");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const connectDB = require("../src/config/db");
const Team = require("../src/models/Team");
const Player = require("../src/models/Player");
const Fixture = require("../src/models/Fixture");
const User = require("../src/models/User");
const marketGen = require("../src/services/marketGen");
const wallet = require("../src/services/wallet");
const { withTx } = require("../src/config/db");

// [name, attackFactor, defenceFactor] — defenceFactor > 1 means leakier defence.
const TEAMS = [
  ["Arsenal", 1.15, 0.85], ["Manchester City", 1.2, 0.85], ["Liverpool", 1.15, 0.9], ["Chelsea", 1.05, 1.0],
  ["Tottenham", 1.05, 1.05], ["Newcastle", 1.0, 0.95], ["Aston Villa", 1.0, 1.0], ["Brighton", 0.95, 1.05],
];
// [name, team, position, shots, sot, goals, assists, tackles, key_passes]  (per 90)
const PLAYERS = [
  ["Bukayo Saka", "Arsenal", "MID", 2.6, 1.0, 0.35, 0.3, 1.2, 2.4], ["Kai Havertz", "Arsenal", "FWD", 2.4, 0.9, 0.38, 0.15, 0.9, 1.0],
  ["Erling Haaland", "Manchester City", "FWD", 3.8, 1.9, 0.9, 0.12, 0.3, 0.8], ["Phil Foden", "Manchester City", "MID", 2.7, 1.1, 0.35, 0.3, 0.8, 2.2],
  ["Mohamed Salah", "Liverpool", "FWD", 3.6, 1.6, 0.6, 0.35, 0.6, 2.5], ["Dominik Szoboszlai", "Liverpool", "MID", 2.8, 1.0, 0.2, 0.2, 1.6, 2.2],
  ["Cole Palmer", "Chelsea", "MID", 3.0, 1.2, 0.5, 0.3, 1.1, 2.6], ["Nicolas Jackson", "Chelsea", "FWD", 3.0, 1.1, 0.45, 0.1, 0.8, 0.8],
  ["Son Heung-min", "Tottenham", "FWD", 3.0, 1.2, 0.45, 0.25, 0.7, 1.4], ["James Maddison", "Tottenham", "MID", 2.2, 0.8, 0.2, 0.3, 1.0, 2.7],
  ["Alexander Isak", "Newcastle", "FWD", 3.2, 1.4, 0.6, 0.15, 0.6, 1.0], ["Bruno Guimaraes", "Newcastle", "MID", 1.5, 0.5, 0.12, 0.2, 2.8, 1.6],
  ["Ollie Watkins", "Aston Villa", "FWD", 3.1, 1.3, 0.5, 0.2, 0.9, 1.1], ["Morgan Rogers", "Aston Villa", "MID", 2.3, 0.9, 0.25, 0.25, 1.3, 1.5],
  ["Kaoru Mitoma", "Brighton", "MID", 2.2, 0.8, 0.25, 0.2, 1.2, 1.3], ["Joao Pedro", "Brighton", "FWD", 2.7, 1.1, 0.4, 0.15, 0.8, 1.2],
];
const STATS = ["shots", "shots_on_target", "goals", "assists", "tackles", "key_passes"];
const PAIRS = [[0, 1], [2, 3], [4, 5], [6, 7]]; // fixtures: index into TEAMS

(async () => {
  await connectDB();
  const teams = {};
  for (const [name, att, def] of TEAMS) teams[name] = await Team.findOneAndUpdate({ name }, { name, attackFactor: att, defenceFactor: def }, { upsert: true, new: true });
  for (const [name, team, position, ...rates] of PLAYERS) {
    await Player.findOneAndUpdate({ name }, {
      name, teamId: teams[team]._id, position, per90: Object.fromEntries(STATS.map((s, i) => [s, rates[i]])),
      minutesSample: 1800, expectedMinutes: position === "FWD" ? 80 : 85,
    }, { upsert: true });
  }
  const gw = ((await Fixture.findOne().sort({ gameweek: -1 }))?.gameweek || 0) + 1;
  const kickoff = new Date(Date.now() + 3 * 864e5); kickoff.setHours(15, 0, 0, 0);
  let created = 0;
  for (const [h, a] of PAIRS) {
    const f = await Fixture.create({ homeTeamId: teams[TEAMS[h][0]]._id, awayTeamId: teams[TEAMS[a][0]]._id, kickoff, gameweek: gw });
    created += (await marketGen.generateForFixture(f._id)).created.length;
    await marketGen.openMarkets({ fixtureId: f._id });
  }
  console.log(`Seeded gameweek ${gw}: ${PAIRS.length} fixtures, ${created} markets opened.`);

  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    const email = process.env.ADMIN_EMAIL.toLowerCase();
    if (!(await User.exists({ email }))) {
      await withTx(async (session) => {
        const [u] = await User.create([{ email, passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD, 10), name: "Admin", dob: new Date("1990-01-01"), role: "admin" }], { session });
        await wallet.signupGrant(session, u);
      });
      console.log(`Created admin ${email}`);
    } else {
      await User.updateOne({ email }, { role: "admin" });
      console.log(`Promoted ${email} to admin`);
    }
  }
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
