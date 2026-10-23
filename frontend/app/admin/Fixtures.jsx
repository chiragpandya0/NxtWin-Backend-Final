"use client";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { api } from "../utils/api";
import { act, inputCls, useAdminGet } from "./hooks";

const STATS = ["shots", "shots_on_target", "goals", "assists", "tackles", "key_passes"];
const label = (s) => s.replace(/_/g, " ");
const hasAny = (r = {}) => STATS.some((s) => r[s] !== undefined && r[s] !== "");
const empty = (r = {}) => (r.minutes === undefined || r.minutes === "");

// Enter / review a fixture's results. Saved results are locked until you choose to edit them.
function Results({ fixture, players, onChange, allSettled }) {
  const [rows, setRows] = useState({});
  const [locked, setLocked] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [saving, setSaving] = useState(false);
  // Typing a stat for a player with no minutes yet assumes a full 90 (editable), so nothing is silently ignored
  const set = (pid, k, v) => setRows((r) => {
    const cur = r[pid] || {};
    const autoMinutes = k !== "minutes" && v !== "" && empty(cur) ? { minutes: "90" } : {};
    return { ...r, [pid]: { ...cur, ...autoMinutes, [k]: v } };
  });

  // Load whatever is already stored for this fixture
  useEffect(() => {
    let alive = true;
    api.admin.get(`/fixtures/${fixture._id}/results`).then(({ results }) => {
      if (!alive) return;
      const next = {};
      for (const r of results) {
        next[r.subjectId] = { minutes: String(r.minutes), ...Object.fromEntries(STATS.map((s) => [s, r.stats?.[s] ? String(r.stats[s]) : ""])) };
      }
      setRows(next);
      setLocked(fixture.status === "finished" && results.length > 0);
    }).catch(() => {});
    return () => { alive = false; };
  }, [fixture._id, fixture.status]);

  const missing = players.filter((p) => empty(rows[p._id]));

  const save = async () => {
    // Stats typed without minutes would otherwise be ignored: tell the admin
    const noMinutes = players.filter((p) => empty(rows[p._id]) && hasAny(rows[p._id]));
    if (noMinutes.length) return toast.error(`Enter minutes (Min) for: ${noMinutes.map((p) => p.name).join(", ")}`);
    const entered = players.filter((p) => !empty(rows[p._id]));
    if (!entered.length) return toast.error("Enter minutes played for at least one player first");
    if (missing.length && !window.confirm(
      `${missing.length} player(s) have no minutes and will be treated as DID NOT PLAY, so all their markets will be VOIDED and refunded:\n\n${missing.map((p) => `• ${p.name}`).join("\n")}\n\nSave anyway?`)) return;
    setSaving(true);
    const results = entered.map((p) => ({
      subjectType: "player", subjectId: p._id, minutes: Number(rows[p._id].minutes),
      stats: Object.fromEntries(STATS.map((s) => [s, Number(rows[p._id][s] || 0)])),
    }));
    const ok = await act(() => api.admin.put(`/fixtures/${fixture._id}/results`, { results }), `Results saved for ${results.length} player(s). Fixture is finished.`, onChange);
    setSaving(false);
    if (ok) { setLocked(true); setSavedAt(new Date()); }
  };

  return (
    <div className="mt-3 space-y-3">
      {locked ? (
        <div className="rounded-md border border-green-500/40 bg-green-500/10 p-3 text-sm flex flex-wrap items-center justify-between gap-2">
          <span>✔ Results saved and locked{savedAt ? ` at ${savedAt.toLocaleTimeString()}` : ""}. Fixture is <b>finished</b>. {allSettled ? <>All markets are settled. Use <b>Edit results</b> then <b>Re-check settlement</b> to correct a mistake.</> : <>Next: click <b>Settle</b> to pay out.</>}</span>
          <Button size="sm" variant="outline" onClick={() => setLocked(false)}>Edit results</Button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Type the stats for every player who played (minutes default to 90, change if needed). A player with <b>no minutes</b> is treated as <b>did not play</b>: their markets are voided and refunded.
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="text-sm">
          <thead><tr><th className="text-left pr-3">Player</th><th className="px-1">Min</th>{STATS.map((s) => <th key={s} className="px-1 capitalize">{label(s)}</th>)}<th className="px-2 text-left">Markets</th></tr></thead>
          <tbody>{players.map((p) => {
            const r = rows[p._id] || {};
            const dnp = empty(r);
            return (
              <tr key={p._id} className={dnp && !locked ? "bg-amber-500/5" : ""}>
                <td className="pr-3 py-0.5">{p.name}{dnp && <span className="ml-2 text-xs text-amber-500">{locked ? "did not play (void)" : "no minutes → void"}</span>}</td>
                <td><input disabled={locked} className={`${inputCls} w-14`} type="number" min="0" max="130" value={r.minutes ?? ""} onChange={(e) => set(p._id, "minutes", e.target.value)} /></td>
                {STATS.map((s) => <td key={s}><input disabled={locked} className={`${inputCls} w-16`} type="number" min="0" value={r[s] ?? ""} onChange={(e) => set(p._id, s, e.target.value)} /></td>)}
                <td className="px-2 text-muted-foreground">{p.markets}</td>
              </tr>);
          })}</tbody>
        </table>
      </div>
      {!locked && <Button size="sm" disabled={saving} onClick={save}>{saving ? "Saving…" : "Save results"}</Button>}
    </div>
  );
}

function FixtureCard({ f, teams, players, open, onToggle, reloadFixtures }) {
  const [markets, reloadMarkets] = useAdminGet(`/markets?fixtureId=${f._id}`);
  const [summary, setSummary] = useState(null);
  const tName = (id) => teams?.teams.find((t) => t._id === id)?.name || "?";

  const list = markets?.markets || [];
  const counts = useMemo(() => {
    const c = { total: list.length, draft: 0, open: 0, settled: 0 };
    list.forEach((m) => { if (m.status === "draft") c.draft += 1; else if (["resolved", "void"].includes(m.status)) c.settled += 1; else c.open += 1; });
    return c;
  }, [list]);

  // Only players who actually have markets in this fixture need results
  const squad = useMemo(() => {
    const per = new Map();
    list.filter((m) => m.status !== "draft" && m.subjectType === "player").forEach((m) => per.set(m.subjectId, (per.get(m.subjectId) || 0) + 1));
    return (players?.players || []).filter((p) => per.has(p._id)).map((p) => ({ ...p, markets: per.get(p._id) }));
  }, [list, players]);

  const refresh = async () => { await reloadFixtures(); await reloadMarkets(); };

  const settle = async () => {
    if (f.status !== "finished") return toast.error("Save the results first: this fixture is still " + f.status + ". Click “Enter results”.");
    const p = await api.admin.get(`/fixtures/${f._id}/settlement-preview`);
    const recheck = p.settled > 0 && p.unsettled === 0;
    let msg;
    if (recheck) {
      if (p.changes === 0) return toast.success(`All ${p.settled} markets are already settled and match the saved results. Nothing to do.`);
      msg = `${p.changes} settled market(s) disagree with the saved results. Correct them? Payouts are reversed and re-paid.`;
    } else {
      if (p.unsettled === 0) return toast.error("This fixture has no open markets to settle.");
      msg = `Settle ${p.unsettled} market(s)?\n\n  YES wins: ${p.wouldSettle.yes}\n  NO wins: ${p.wouldSettle.no}\n  VOID (refund): ${p.wouldSettle.void}` +
        (p.undecidable ? `\n  Cannot decide yet: ${p.undecidable}` : "") +
        (p.voidedPlayers.length ? `\n\nPlayers treated as DID NOT PLAY (voided and refunded):\n${p.voidedPlayers.map((n) => `• ${n}`).join("\n")}` : "") +
        `\n\nWinners are paid immediately.`;
    }
    if (!window.confirm(msg)) return;
    const r = await act(() => api.admin.post(`/fixtures/${f._id}/settle${recheck ? "?recheck=1" : ""}`),
      (x) => (recheck ? `Corrected ${x.corrected} market(s)` : `Settled ${x.settled} markets: ${x.yes} YES, ${x.no} NO, ${x.void} void`), refresh);
    if (r) setSummary(r);
  };

  return (
    <Card><CardContent className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="font-medium">{tName(f.homeTeamId)} v {tName(f.awayTeamId)}</div>
          <div className="text-sm text-muted-foreground">
            GW{f.gameweek} · {new Date(f.kickoff).toLocaleString()} · <Badge variant={f.status === "finished" ? "default" : "outline"}>{f.status}</Badge>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {counts.total} markets · {counts.open} open · <b className={counts.settled ? "text-green-500" : ""}>{counts.settled} settled</b>{counts.draft ? ` · ${counts.draft} draft` : ""}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => act(() => api.admin.post(`/fixtures/${f._id}/generate-markets`), (r) => `Generated ${r.created} markets (${r.skipped.length} players skipped)`, refresh)}>Generate markets</Button>
          <Button size="sm" variant="outline" onClick={() => act(() => api.admin.post(`/fixtures/${f._id}/open-markets`), (r) => `Opened ${r.opened} markets`, refresh)}>Open markets</Button>
          <Button size="sm" variant="outline" onClick={onToggle}>{open ? "Hide results" : f.status === "finished" ? "View results" : "Enter results"}</Button>
          <Button size="sm" onClick={settle}>{counts.settled > 0 && counts.open === 0 ? "Re-check settlement" : "Settle"}</Button>
          <Button size="sm" variant="destructive" onClick={() => window.confirm("Mark postponed? Markets void after the configured postponement window.") && act(() => api.admin.put(`/fixtures/${f._id}`, { status: "postponed" }), "Marked postponed", refresh)}>Postponed</Button>
        </div>
      </div>
      {summary && (
        <div className="mt-3 rounded-md border border-green-500/40 bg-green-500/10 p-3 text-sm">
          ✔ Settlement complete: <b>{summary.settled}</b> markets settled ({summary.yes} YES, {summary.no} NO, {summary.void} void)
          {summary.corrected ? `, ${summary.corrected} corrected` : ""}{summary.pending ? <span className="text-amber-500"> · {summary.pending} could not be decided yet</span> : ""}. Winners have been paid.
        </div>
      )}
      {open && <Results fixture={f} players={squad} onChange={refresh} allSettled={counts.settled > 0 && counts.open === 0} />}
    </CardContent></Card>
  );
}

export default function Fixtures() {
  const [fixtures, reload] = useAdminGet("/fixtures");
  const [teams] = useAdminGet("/teams");
  const [players] = useAdminGet("/players");
  const [open, setOpen] = useState(null);
  const [form, setForm] = useState({ homeTeamId: "", awayTeamId: "", kickoff: "", gameweek: 1 });
  const create = () => act(() => api.admin.post("/fixtures", { ...form, gameweek: Number(form.gameweek), kickoff: new Date(form.kickoff).toISOString() }), "Fixture created", reload);

  return (
    <div className="space-y-4 mt-4">
      <Card><CardHeader><CardTitle>New fixture</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2 items-end">
        {["homeTeamId", "awayTeamId"].map((k) => (
          <select key={k} className={inputCls} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })}>
            <option value="">{k === "homeTeamId" ? "Home team" : "Away team"}</option>{teams?.teams.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}</select>))}
        <input className={inputCls} type="datetime-local" value={form.kickoff} onChange={(e) => setForm({ ...form, kickoff: e.target.value })} />
        <input className={`${inputCls} w-24`} type="number" min="1" value={form.gameweek} onChange={(e) => setForm({ ...form, gameweek: e.target.value })} />
        <Button size="sm" onClick={create} disabled={!form.homeTeamId || !form.awayTeamId || !form.kickoff}>Create</Button>
      </CardContent></Card>
      {(fixtures?.fixtures || []).map((f) => (
        <FixtureCard key={f._id} f={f} teams={teams} players={players} open={open === f._id}
          onToggle={() => setOpen(open === f._id ? null : f._id)} reloadFixtures={reload} />
      ))}
    </div>
  );
}
