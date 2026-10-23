// Sportmonks v3 adapter (fixtures only so far). UNVERIFIED against the live API: needs an account/token.
// Field mapping follows Sportmonks v3 docs and should be checked against real responses before relying on it.
const fetch = require("node-fetch");
const env = require("../../config/env");
const Team = require("../../models/Team");
const Fixture = require("../../models/Fixture");

const BASE = "https://api.sportmonks.com/v3/football";

const call = async (path, params = {}) => {
  if (!env.sportmonksToken) throw Object.assign(new Error("SPORTMONKS_API_TOKEN not configured"), { status: 503 });
  const qs = new URLSearchParams({ api_token: env.sportmonksToken, ...params });
  const r = await fetch(`${BASE}${path}?${qs}`);
  if (!r.ok) throw new Error(`Sportmonks ${r.status}`);
  return r.json();
};

const syncFixtures = async (from, to) => {
  const body = await call(`/fixtures/between/${from}/${to}`, { include: "participants" });
  let n = 0;
  for (const fx of body.data || []) {
    const home = fx.participants?.find((p) => p.meta?.location === "home");
    const away = fx.participants?.find((p) => p.meta?.location === "away");
    if (!home || !away) continue;
    const [h, a] = await Promise.all([home, away].map((t) =>
      Team.findOneAndUpdate({ name: t.name }, { $setOnInsert: { name: t.name }, externalId: String(t.id) }, { upsert: true, new: true })));
    await Fixture.findOneAndUpdate({ externalId: String(fx.id) },
      { homeTeamId: h._id, awayTeamId: a._id, kickoff: new Date(`${fx.starting_at.replace(" ", "T")}Z`), gameweek: fx.round_id || 1, externalId: String(fx.id) },
      { upsert: true });
    n += 1;
  }
  return { synced: n };
};

module.exports = { syncFixtures };
