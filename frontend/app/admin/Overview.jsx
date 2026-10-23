"use client";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { BASE_URL, getToken } from "../utils/api";
import { formatPence, formatPrice } from "../utils/pricing";
import { useAdminGet } from "./hooks";

export default function Overview() {
  const [summary] = useAdminGet("/reports/summary");
  const [rec, reloadRec] = useAdminGet("/reports/reconcile");
  const [exp] = useAdminGet("/reports/exposure");
  const [audit] = useAdminGet("/audit");

  const downloadCalibration = async () => {
    const r = await fetch(`${BASE_URL}/api/admin/reports/calibration?format=csv`, { headers: { Authorization: `Bearer ${getToken()}` } });
    const url = URL.createObjectURL(await r.blob());
    Object.assign(document.createElement("a"), { href: url, download: "calibration.csv" }).click();
  };

  const worst = (exp?.markets || []).reduce((a, m) => a + Math.max(0, m.lossIfYes, m.lossIfNo), 0);

  return (
    <div className="space-y-6 mt-4">
      <div className="grid sm:grid-cols-4 gap-4">
        {[["Users", summary?.users], ["Open markets", summary?.openMarkets], ["Resolved", summary?.resolvedMarkets], ["Volume", summary && formatPence(summary.volumePence)]].map(([l, v]) => (
          <Card key={l}><CardContent className="p-4"><div className="text-sm text-muted-foreground">{l}</div><div className="text-2xl font-bold">{v ?? "—"}</div></CardContent></Card>))}
      </div>
      <Card><CardHeader className="flex flex-row justify-between items-center"><CardTitle>Ledger reconciliation</CardTitle>
        <div className="flex gap-2"><Button size="sm" variant="outline" onClick={reloadRec}>Re-run</Button><Button size="sm" variant="outline" onClick={downloadCalibration}>Calibration CSV</Button></div></CardHeader>
        <CardContent>{rec ? (rec.ok ? <Badge>OK · {rec.checked} users, no drift</Badge> : <div className="text-red-500 text-sm">Drift on {rec.drift.length} users: {JSON.stringify(rec.drift)}</div>) : "…"}</CardContent></Card>
      <Card><CardHeader><CardTitle>House exposure (open markets)</CardTitle><p className="text-sm text-muted-foreground">Worst-case virtual loss if every market goes against the house: £{worst.toFixed(2)}</p></CardHeader>
        <CardContent><Table><TableHeader><TableRow><TableHead>Market</TableHead><TableHead>YES</TableHead><TableHead>b</TableHead><TableHead>Loss if YES</TableHead><TableHead>Loss if NO</TableHead><TableHead>Max-loss bound</TableHead></TableRow></TableHeader>
          <TableBody>{(exp?.markets || []).map((m) => (<TableRow key={m.marketId}><TableCell>{m.title}</TableCell><TableCell>{formatPrice(m.pYes)}</TableCell><TableCell>{m.b}</TableCell>
            <TableCell>£{m.lossIfYes.toFixed(2)}</TableCell><TableCell>£{m.lossIfNo.toFixed(2)}</TableCell><TableCell>£{m.maxLossBound.toFixed(2)}</TableCell></TableRow>))}</TableBody></Table></CardContent></Card>
      <Card><CardHeader><CardTitle>Audit log</CardTitle></CardHeader><CardContent className="text-sm space-y-1 max-h-64 overflow-auto">
        {(audit?.log || []).map((l) => <div key={l._id} className="flex justify-between"><span>{l.action} <span className="text-muted-foreground">{l.target}</span></span><span className="text-muted-foreground">{new Date(l.createdAt).toLocaleString()}</span></div>)}</CardContent></Card>
    </div>
  );
}
