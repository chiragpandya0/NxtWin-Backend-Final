"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { api } from "../utils/api";
import { useUser, refreshUser } from "../utils/auth";
import { formatPence, formatPrice } from "../utils/pricing";

export default function PortfolioPage() {
  const { isSignedIn, isLoaded } = useUser();
  const [data, setData] = useState(null);
  const load = () => api.portfolio().then(setData).catch(() => setData(null));
  useEffect(() => { if (isSignedIn) load(); }, [isSignedIn]);

  if (isLoaded && !isSignedIn) return <div className="min-h-screen pt-32 text-center">Please <Link className="underline" href="/sign-in">sign in</Link> to see your portfolio.</div>;
  if (!data) return <div className="min-h-screen pt-32 text-center text-muted-foreground">Loading…</div>;

  const openValue = data.positions.reduce((a, p) => a + p.valuePence, 0);
  const sell = async (id) => {
    try { const r = await api.accaSell(id); toast.success(`Sold back for ${formatPence(r.valuePence)}`); refreshUser(); load(); } catch (e) { toast.error(e.message); }
  };

  return (
    <div className="min-h-screen pt-24 pb-10 px-4 container mx-auto max-w-6xl space-y-6">
      <div className="grid sm:grid-cols-3 gap-4">
        <Stat label="Balance" value={formatPence(data.balancePence)} />
        <Stat label="Open positions value" value={formatPence(openValue)} />
        <Stat label="Total" value={formatPence(data.balancePence + openValue)} />
      </div>

      <Card><CardHeader><CardTitle>Open positions</CardTitle></CardHeader><CardContent>
        {data.positions.length === 0 ? <p className="text-sm text-muted-foreground">No open positions.</p> : (
          <Table><TableHeader><TableRow><TableHead>Market</TableHead><TableHead>Side</TableHead><TableHead>Shares</TableHead><TableHead>Cost</TableHead><TableHead>Now</TableHead><TableHead>Value</TableHead></TableRow></TableHeader>
            <TableBody>{data.positions.map((p) => (
              <TableRow key={p.marketId + p.side}><TableCell><Link className="underline" href={`/bid/${p.marketId}`}>{p.title}</Link></TableCell>
                <TableCell>{p.side.toUpperCase()}</TableCell><TableCell>{p.shares}</TableCell><TableCell>{formatPence(p.costPence)}</TableCell>
                <TableCell>{formatPrice(p.price)}</TableCell><TableCell>{formatPence(p.valuePence)}</TableCell></TableRow>))}</TableBody></Table>)}
      </CardContent></Card>

      <Card><CardHeader><CardTitle>Accumulators</CardTitle></CardHeader><CardContent className="space-y-3">
        {data.accumulators.length === 0 && <p className="text-sm text-muted-foreground">No accumulators yet.</p>}
        {data.accumulators.map((a) => (
          <div key={a._id} className="rounded-lg border p-3 text-sm flex flex-wrap justify-between gap-2">
            <div>
              <div className="font-medium">{a.legs.length} picks · stake {formatPence(a.stakePence)} · pays {formatPence(a.payoutPence)}</div>
              <div className="text-muted-foreground">{a.legs.map((l) => `${l.side.toUpperCase()} (${l.result})`).join(", ")}</div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={a.status === "won" ? "default" : "secondary"}>{a.status}</Badge>
              {a.status === "open" && new Date(a.firstKickoff) > new Date() && <Button size="sm" variant="outline" onClick={() => sell(a._id)}>Sell back</Button>}
            </div>
          </div>))}
      </CardContent></Card>

      <Card><CardHeader><CardTitle>Settled</CardTitle></CardHeader><CardContent>
        {data.settledPositions.length === 0 ? <p className="text-sm text-muted-foreground">Nothing settled yet.</p> : (
          <Table><TableHeader><TableRow><TableHead>Market</TableHead><TableHead>Side</TableHead><TableHead>Shares</TableHead><TableHead>Result</TableHead></TableRow></TableHeader>
            <TableBody>{data.settledPositions.map((p) => (
              <TableRow key={p.marketId + p.side}><TableCell>{p.title}</TableCell><TableCell>{p.side.toUpperCase()}</TableCell><TableCell>{p.shares}</TableCell>
                <TableCell>{p.status === "void" ? "Void (refunded)" : p.resolution === p.side ? <Badge>Won</Badge> : <Badge variant="secondary">Lost</Badge>}</TableCell></TableRow>))}</TableBody></Table>)}
      </CardContent></Card>
    </div>
  );
}

const Stat = ({ label, value }) => (
  <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">{label}</div><div className="text-2xl font-bold">{value}</div></CardContent></Card>
);
