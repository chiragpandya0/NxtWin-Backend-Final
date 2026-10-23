const Fixture = require("../models/Fixture");
const Player = require("../models/Player");
const Team = require("../models/Team");
const Market = require("../models/Market");
const PriceSnapshot = require("../models/PriceSnapshot");
const { getSettings } = require("../config/settings");
const lmsr = require("../engine/lmsr");
const model = require("../engine/model");

// Stat families and candidate lines; dispersion (negative binomial r) where counts are overdispersed.
const STATS = {
  shots: { label: "shots", lines: [0.5, 1.5, 2.5, 3.5, 4.5], dispersion: 4 },
  shots_on_target: { label: "shots on target", lines: [0.5, 1.5, 2.5], dispersion: 6 },
  goals: { label: "goals", lines: [0.5, 1.5], dispersion: null },
  assists: { label: "assists", lines: [0.5, 1.5], dispersion: null },
  tackles: { label: "tackles", lines: [0.5, 1.5, 2.5, 3.5], dispersion: 6 },
  key_passes: { label: "key passes", lines: [0.5, 1.5, 2.5], dispersion: 5 },
};
const HOME_FACTOR = 1.05;
const AWAY_FACTOR = 0.95;
const MAX_LINES_PER_STAT = 4;
// Defensive stats rise against stronger attacks; attacking stats fall against stronger defences.
const DEFENSIVE = new Set(["tackles"]);

const titleFor = (name, stat, line) => `${name} ${STATS[stat]?.label || stat} over ${line}`;

// Create draft markets for a fixture from the pricing model. Safe to re-run (unique index skips duplicates).
// opts.stats limits stat families, opts.playerIds limits players (used by the demo seed).
const generateForFixture = async (fixtureId, opts = {}) => {
  const settings = await getSettings();
  const fixture = await Fixture.findById(fixtureId);
  if (!fixture) throw Object.assign(new Error("Fixture not found"), { status: 404 });
  const [home, away] = await Promise.all([Team.findById(fixture.homeTeamId), Team.findById(fixture.awayTeamId)]);

  const created = [];
  const skipped = [];
  for (const [team, opp, factor] of [[home, away, HOME_FACTOR], [away, home, AWAY_FACTOR]]) {
    const players = await Player.find({ teamId: team._id, active: true, ...(opts.playerIds && { _id: { $in: opts.playerIds } }) });
    for (const player of players) {
      if (player.minutesSample < settings.minMinutesSample) {
        skipped.push({ player: player.name, reason: "unreliable data" });
        continue;
      }
      for (const [stat, cfg] of Object.entries(STATS)) {
        if (opts.stats && !opts.stats.includes(stat)) continue;
        const per90 = player.per90.get(stat);
        if (!per90) continue;
        const opponentFactor = DEFENSIVE.has(stat) ? opp.attackFactor : opp.defenceFactor;
        const mean = model.expectedMean({ per90, expectedMinutes: player.expectedMinutes, opponentFactor, homeAwayFactor: factor });
        const offered = cfg.lines
          .map((line) => ({ line, p: model.probOver(line, mean, cfg.dispersion) }))
          .filter((x) => model.isOfferable(x.p, settings))
          .slice(0, MAX_LINES_PER_STAT);
        for (const { line, p } of offered) {
          const exists = await Market.exists({ fixtureId, subjectType: "player", subjectId: player._id, stat, line });
          if (exists) continue;
          const m = await Market.create({
            fixtureId, subjectType: "player", subjectId: player._id, stat, line,
            title: titleFor(player.name, stat, line), b: settings.defaultB,
            openProb: p, modelProb: p, q: lmsr.seed(p, settings.defaultB),
            status: "draft", kickoff: fixture.kickoff, gameweek: fixture.gameweek,
          });
          created.push(m);
        }
      }
    }
  }
  return { created, skipped };
};

// Move draft markets to open and write the opening price snapshot.
const openMarkets = async (filter) => {
  const drafts = await Market.find({ ...filter, status: "draft" });
  for (const m of drafts) {
    m.status = "open";
    await m.save();
    await PriceSnapshot.create({ marketId: m._id, pYes: lmsr.priceYes(m.q, m.b), q: m.q, reason: "open" });
  }
  return drafts.length;
};

module.exports = { generateForFixture, openMarkets, STATS, titleFor };
