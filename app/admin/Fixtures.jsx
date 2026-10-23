"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { api } from "../utils/api";
import { act, inputCls, useAdminGet } from "./hooks";

const STATS = ["shots", "shots_on_target", "goals", "assists", "tackles", "key_passes"];

function Results({ fixture, players, onDone }) {
  const [rows, setRows] = useState({});
  const set = (pid, k, v) => setRows((r) => ({ ...r, [pid]: { ...(r[pid] || {}), [k]: v } }));
  const save = () => {
    const results = Object.entries(rows).filter(([, r]) => r.minutes !== undefined && r.minutes !== "").map(([pid, r]) => ({
      subjectType: "player", subjectId: pid, minutes: Number(r.minutes),
      stats: Object.fromEntries(STATS.map((s) => [s, Number(r[s] || 0)])),
    }));
    if (!results.length) return;
    act(() => api.admin.put(`/fixtures/${fixture._id}/results`, { results }), "Results saved (fixture marked finished)", onDone);
  };
  return (
    <div className="mt-3 space-y-2 overflow-x-auto">
      <p className="text-xs text-muted-foreground">Enter minutes for every player who featured; leave blank for players who did not play (their markets void).</p>
      <table className="text-sm"><thead><tr><th className="text-left pr-3">Player</th><th>Min</th>{STATS.map((s) => <th key={s} className="px-1">{s.replace(/_/g, " ")}</th>)}</tr></thead>
        <tbody>{players.map((p) => (<tr key={p._id}><td className="pr-3">{p.name}</td>
          <td><input className={`${inputCls} w-14`} type="number" onChange={(e) => set(p._id, "minutes", e.target.value)} /></td>
          {STATS.map((s) => <td key={s}><input className={`${inputCls} w-16`} type="number" min="0" onChange={(e) => set(p._id, s, e.target.value)} /></td>)}</tr>))}</tbody></table>
      <Button size="sm" onClick={save}>Save results</Button>
    </div>
  );
}

export default function Fixtures() {
  const [fixtures, reload] = useAdminGet("/fixtures");
  const [teams] = useAdminGet("/teams");
  const [players] = useAdminGet("/players");
  const [open, setOpen] = useState(null);
  const [form, setForm] = useState({ homeTeamId: "", awayTeamId: "", kickoff: "", gameweek: 1 });
  const tName = (id) => teams?.teams.find((t) => t._id === id)?.name || "?";

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

      {(fixtures?.fixtures || []).map((f) => {
        const squad = (players?.players || []).filter((p) => [f.homeTeamId, f.awayTeamId].includes(p.teamId));
        return (
          <Card key={f._id}><CardContent className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div><div className="font-medium">{tName(f.homeTeamId)} v {tName(f.awayTeamId)}</div>
                <div className="text-sm text-muted-foreground">GW{f.gameweek} · {new Date(f.kickoff).toLocaleString()} · <Badge variant="outline">{f.status}</Badge></div></div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => act(() => api.admin.post(`/fixtures/${f._id}/generate-markets`), (r) => `Generated ${r.created} markets (${r.skipped.length} players skipped)`)}>Generate markets</Button>
                <Button size="sm" variant="outline" onClick={() => act(() => api.admin.post(`/fixtures/${f._id}/open-markets`), (r) => `Opened ${r.opened} markets`)}>Open markets</Button>
                <Button size="sm" variant="outline" onClick={() => setOpen(open === f._id ? null : f._id)}>Enter results</Button>
                <Button size="sm" onClick={() => act(() => api.admin.post(`/fixtures/${f._id}/settle`), (r) => `Settled ${r.settled}, pending ${r.pending}`)}>Settle</Button>
                <Button size="sm" variant="destructive" onClick={() => window.confirm("Mark postponed? Markets void after the configured postponement window.") && act(() => api.admin.put(`/fixtures/${f._id}`, { status: "postponed" }), "Marked postponed", reload)}>Postponed</Button>
              </div>
            </div>
            {open === f._id && <Results fixture={f} players={squad} onDone={reload} />}
          </CardContent></Card>);
      })}
    </div>
  );
}
