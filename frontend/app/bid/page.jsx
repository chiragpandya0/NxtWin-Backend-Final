"use client";
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import SpotlightCard from "../components/SpotlightCard";
import PlayerAvatar from "../components/PlayerAvatar";
import StatLadders, { STAT_ORDER, statLabel } from "../components/StatLadders";
import { api } from "../utils/api";
import { formatPence } from "../utils/pricing";

const kickoffLabel = (d) =>
  new Date(d).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default function Page() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [stat, setStat] = useState("All");
  const [fixture, setFixture] = useState("all");
  const [sortBy, setSortBy] = useState("kickoff");

  useEffect(() => {
    api
      .groups()
      .then((d) => setGroups(d.groups))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const present = new Set(groups.flatMap((g) => g.stats.map((s) => s.stat)));
    return ["All", ...STAT_ORDER.filter((s) => present.has(s)), ...[...present].filter((s) => !STAT_ORDER.includes(s))];
  }, [groups]);

  const fixtures = useMemo(() => {
    const m = new Map();
    groups.forEach((g) => g.fixture && m.set(g.fixture.id, g.fixture));
    return [...m.values()].sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff));
  }, [groups]);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    let r = groups
      .filter((g) => fixture === "all" || g.fixture?.id === fixture)
      .filter((g) => !ql || [g.subject.name, g.subject.team, g.fixture?.home, g.fixture?.away].some((x) => x?.toLowerCase().includes(ql)))
      .map((g) => (stat === "All" ? g : { ...g, stats: g.stats.filter((s) => s.stat === stat) }))
      .filter((g) => g.stats.length > 0);
    if (sortBy === "volume") r = [...r].sort((a, b) => b.volumePence - a.volumePence);
    else if (sortBy === "name") r = [...r].sort((a, b) => a.subject.name.localeCompare(b.subject.name));
    return r;
  }, [groups, q, stat, fixture, sortBy]);

  // Section by fixture when sorted by kick-off
  const sections = useMemo(() => {
    if (sortBy !== "kickoff") return [{ id: "all", title: null, items: filtered }];
    const by = new Map();
    filtered.forEach((g) => {
      const k = g.fixture?.id || "none";
      if (!by.has(k)) by.set(k, { id: k, fixture: g.fixture, items: [] });
      by.get(k).items.push(g);
    });
    return [...by.values()];
  }, [filtered, sortBy]);

  const reset = () => { setQ(""); setStat("All"); setFixture("all"); setSortBy("kickoff"); };

  if (loading) {
    return <div className="min-h-screen w-full bg-[#030712] text-slate-100 flex items-center justify-center"><div className="text-xl">Loading markets...</div></div>;
  }

  return (
    <div className="min-h-screen w-full bg-[#030712] text-slate-100 selection:bg-cyan-300 selection:text-black">
      <div className="pointer-events-none fixed inset-0 opacity-60">
        <div className="absolute inset-0 bg-[radial-gradient(1100px_500px_at_15%_-10%,rgba(0,255,200,0.07),transparent),radial-gradient(1000px_500px_at_85%_110%,rgba(120,60,255,0.08),transparent)]" />
      </div>

      <div className="sticky top-0 z-30 border-b border-white/10 backdrop-blur-xl bg-[#030712]/60">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-3 flex items-center gap-3 pt-20">
          <div className="flex items-center gap-2 flex-1 rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-2">
            <svg className="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none"><path d="M21 21l-4.3-4.3M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" stroke="currentColor" strokeWidth="1.5" /></svg>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search players, teams…" className="bg-transparent outline-none placeholder:text-slate-500 text-slate-100 w-full" />
            <button onClick={reset} className="text-xs px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 transition">Reset</button>
          </div>
          <select value={fixture} onChange={(e) => setFixture(e.target.value)} className="hidden sm:block rounded-xl border border-white/10 bg-[#0b1220] px-3 py-2 text-sm max-w-[260px]">
            <option value="all">All matches</option>
            {fixtures.map((f) => <option key={f.id} value={f.id}>{f.home} v {f.away}</option>)}
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="hidden sm:block rounded-xl border border-white/10 bg-[#0b1220] px-3 py-2 text-sm">
            <option value="kickoff">Kick-off</option>
            <option value="volume">Volume</option>
            <option value="name">Player A–Z</option>
          </select>
        </div>
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 pb-3">
          <div className="flex flex-wrap gap-2">
            {stats.map((c) => (
              <button key={c} onClick={() => setStat(c)}
                className={`px-3 py-1.5 rounded-full text-sm border capitalize ${stat === c ? "border-emerald-400/60 bg-emerald-300/10 text-emerald-200 shadow-[0_0_24px_rgba(16,185,129,0.25)]" : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.08]"}`}>
                {c === "All" ? "All stats" : statLabel(c)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-6">
        <div className="mb-4 text-sm text-slate-400">
          {filtered.length} players · {filtered.reduce((a, g) => a + g.stats.reduce((x, s) => x + s.lines.length, 0), 0)} markets
        </div>
        {error && <div className="text-center py-16 text-red-400">Could not load markets: {error}</div>}
        {!error && filtered.length === 0 && <div className="text-center py-16 text-slate-400">No markets found</div>}

        {sections.map((sec) => (
          <section key={sec.id} className="mb-10">
            {sec.fixture && (
              <div className="mb-3 flex items-baseline gap-3">
                <h2 className="text-lg font-semibold">{sec.fixture.home} <span className="text-slate-500">v</span> {sec.fixture.away}</h2>
                <span className="text-sm text-slate-400">{kickoffLabel(sec.fixture.kickoff)} · Gameweek {sec.fixture.gameweek}</span>
              </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-5">
              {sec.items.map((g) => <PlayerCard key={g.key} g={g} showFixture={sortBy !== "kickoff"} />)}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function PlayerCard({ g, showFixture }) {
  const first = g.stats[0]?.lines[0];
  const opp = g.fixture ? (g.fixture.isHome ? g.fixture.away : g.fixture.home) : null;
  return (
    <SpotlightCard className="!p-2 !m-0" spotlightColor="rgba(0, 229, 255, 0.25)">
      <div className="rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl shadow-[0_20px_80px_-20px_rgba(0,0,0,0.6)] p-4 space-y-4">
        <Link href={first ? `/bid/${first.marketId}` : "#"} className="flex items-center gap-3">
          <PlayerAvatar name={g.subject.name} team={g.subject.team} imageUrl={g.subject.imageUrl} size={52} />
          <div className="min-w-0">
            <div className="font-semibold text-slate-100 truncate">{g.subject.name}</div>
            <div className="text-xs text-slate-400 truncate">
              {g.subject.team}{g.subject.position ? ` · ${g.subject.position}` : ""}
              {opp ? ` · ${g.fixture.isHome ? "vs" : "@"} ${opp}` : ""}
            </div>
            {showFixture && g.fixture && <div className="text-xs text-slate-500">{kickoffLabel(g.fixture.kickoff)}</div>}
          </div>
        </Link>
        <StatLadders stats={g.stats} />
        <div className="flex justify-between text-xs text-slate-400 pt-1 border-t border-white/10">
          <span>{g.stats.reduce((a, s) => a + s.lines.length, 0)} markets</span>
          <span>Vol {formatPence(g.volumePence)}</span>
        </div>
      </div>
    </SpotlightCard>
  );
}
