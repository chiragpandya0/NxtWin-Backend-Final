"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { api } from "../utils/api";
import { formatPence } from "../utils/pricing";

export default function LeaderboardPage() {
  const [gw, setGw] = useState("");
  const [data, setData] = useState(null);
  useEffect(() => { api.leaderboard(gw).then(setData).catch(() => setData({ leaderboard: [] })); }, [gw]);
  return (
    <div className="min-h-screen pt-24 pb-10 px-4 container mx-auto max-w-3xl">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Leaderboard{data ? ` · Gameweek ${data.gameweek}` : ""}</CardTitle>
          <input type="number" min="1" placeholder="Gameweek" value={gw} onChange={(e) => setGw(e.target.value)} className="h-9 w-28 rounded-md border bg-transparent px-2 text-sm" />
        </CardHeader>
        <CardContent>
          {!data ? <p className="text-muted-foreground">Loading…</p> : data.leaderboard.length === 0 ? <p className="text-sm text-muted-foreground">No settled markets for this gameweek yet. Ranking is by virtual profit.</p> : (
            <Table><TableHeader><TableRow><TableHead>#</TableHead><TableHead>Player</TableHead><TableHead className="text-right">Virtual profit</TableHead></TableRow></TableHeader>
              <TableBody>{data.leaderboard.map((r) => (
                <TableRow key={r.rank}><TableCell>{r.rank}</TableCell><TableCell>{r.name}</TableCell>
                  <TableCell className={`text-right ${r.profitPence >= 0 ? "text-green-500" : "text-red-500"}`}>{r.profitPence >= 0 ? "+" : ""}{formatPence(r.profitPence)}</TableCell></TableRow>))}</TableBody></Table>)}
        </CardContent>
      </Card>
    </div>
  );
}
