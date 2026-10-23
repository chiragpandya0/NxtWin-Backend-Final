"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { api } from "../utils/api";
import { act, useAdminGet } from "./hooks";

const SAMPLE = `[
  { "name": "Bukayo Saka", "team": "Arsenal", "position": "MID", "minutesSample": 1800, "expectedMinutes": 85,
    "per90": { "shots": 2.6, "shots_on_target": 1.0, "goals": 0.35, "assists": 0.3, "tackles": 1.2, "key_passes": 2.4 } }
]`;

export default function Players() {
  const [players, reload] = useAdminGet("/players");
  const [teams, reloadTeams] = useAdminGet("/teams");
  const [json, setJson] = useState("");
  const [teamName, setTeamName] = useState("");

  const doImport = () => {
    let parsed;
    try { parsed = JSON.parse(json); } catch { return act(() => Promise.reject(new Error("Invalid JSON")), ""); }
    act(() => api.admin.post("/players/import", { players: parsed }), (r) => `Imported ${r.upserted} players`, () => { reload(); reloadTeams(); });
  };

  return (
    <div className="mt-4 space-y-4">
      <Card><CardHeader><CardTitle>Import players (per-90 rates drive the pricing model)</CardTitle></CardHeader><CardContent className="space-y-2">
        <textarea className="w-full h-40 rounded-md border bg-transparent p-2 font-mono text-xs" placeholder={SAMPLE} value={json} onChange={(e) => setJson(e.target.value)} />
        <Button size="sm" onClick={doImport} disabled={!json}>Import</Button>
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Teams ({teams?.teams.length ?? 0})</CardTitle></CardHeader><CardContent className="space-y-2">
        <div className="flex gap-2"><input className="h-9 rounded-md border bg-transparent px-2 text-sm" placeholder="New team" value={teamName} onChange={(e) => setTeamName(e.target.value)} />
          <Button size="sm" disabled={!teamName} onClick={() => act(() => api.admin.post("/teams", { name: teamName }), "Team added", () => { setTeamName(""); reloadTeams(); })}>Add</Button></div>
        <div className="text-sm text-muted-foreground">{teams?.teams.map((t) => t.name).join(" · ")}</div>
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Players ({players?.players.length ?? 0})</CardTitle></CardHeader><CardContent className="text-sm space-y-1 max-h-96 overflow-auto">
        {(players?.players || []).map((p) => <div key={p._id} className="flex justify-between"><span>{p.name} <span className="text-muted-foreground">{teams?.teams.find((t) => t._id === p.teamId)?.name}</span></span>
          <span className="text-muted-foreground">{p.minutesSample} min sample</span></div>)}</CardContent></Card>
    </div>
  );
}
