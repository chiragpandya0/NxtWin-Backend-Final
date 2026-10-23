"use client";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import io from "socket.io-client";
import { toast } from "sonner";
import {
  Award, Bot, Clock, Loader2, Layers, MessageCircle, Target, Wifi, WifiOff, XCircle, AlertTriangle, History,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Skeleton } from "../../components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { AIResultsCard } from "../../components/AIResultsCard";

import { api, BASE_URL, getToken } from "../../utils/api";
import { useUser, refreshUser } from "../../utils/auth";
import { addLeg } from "../../utils/slip";
import { formatPence, formatPrice } from "../../utils/pricing";

const settled = (m) => m && ["resolved", "void"].includes(m.status);

function PriceChart({ history, current }) {
  const data = history.map((h) => ({ t: new Date(h.t).toLocaleString(), yes: Math.round(h.pYes * 1000) / 10 }));
  if (current != null && data.length) data.push({ t: "now", yes: Math.round(current * 1000) / 10 });
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Price history (YES chance)</CardTitle>
      </CardHeader>
      <CardContent className="h-56">
        {data.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <XAxis dataKey="t" hide />
              <YAxis domain={[0, 100]} unit="%" width={44} />
              <Tooltip formatter={(v) => `${v}%`} />
              <ReferenceLine y={50} strokeDasharray="3 3" />
              <Line type="stepAfter" dataKey="yes" stroke="#34d399" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No trades yet</div>
        )}
      </CardContent>
    </Card>
  );
}

function Ladder({ market }) {
  if (!market.ladder || market.ladder.length < 2) return null;
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Other lines</CardTitle></CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {market.ladder.map((l) => (
          <Link key={l.id} href={`/bid/${l.id}`}>
            <Badge variant={l.id === market.id ? "default" : "outline"} className="cursor-pointer text-sm">
              Over {l.line} · {formatPrice(l.yesPrice)}
            </Badge>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}

function OrderPanel({ market, position, onTraded, isSignedIn }) {
  const [action, setAction] = useState("buy");
  const [side, setSide] = useState("yes");
  const [mode, setMode] = useState("shares"); // buy only: shares | spend
  const [amount, setAmount] = useState("10");
  const [quote, setQuote] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const closed = market.status !== "open" || new Date(market.kickoff) <= new Date();
  const held = (position && position[side]) || 0;
  const n = Number(amount);

  const body = () => {
    const b = { marketId: market.id, side, action };
    if (action === "buy" && mode === "spend") b.spendPence = Math.round(n * 100);
    else b.shares = n;
    return b;
  };

  useEffect(() => {
    setQuote(null);
    setError("");
    if (!isSignedIn || closed || !(n > 0)) return;
    const t = setTimeout(async () => {
      try {
        setQuote((await api.quote(body())).quote);
      } catch (e) {
        setError(e.message);
      }
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action, side, mode, amount, market.id, market.yesPrice, isSignedIn, closed]);

  const submit = async () => {
    setBusy(true);
    try {
      const b = body();
      // Guard against the price moving between quote and trade (1% slippage tolerance).
      if (quote && action === "buy") b.maxCostPence = Math.ceil(quote.netPence * 1.01);
      if (quote && action === "sell") b.minProceedsPence = Math.floor(quote.netPence * 0.99);
      b.idempotencyKey = crypto.randomUUID();
      const { trade } = await api.trade(b);
      toast.success(`${action === "buy" ? "Bought" : "Sold"} ${trade.shares} ${side.toUpperCase()}`, {
        description: `${formatPence(trade.netPence)} · avg ${formatPrice(trade.avgPrice)}`,
      });
      onTraded();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const slip = () => {
    try {
      addLeg({ marketId: market.id, title: market.title, side, p: side === "yes" ? market.yesPrice : market.noPrice });
      toast.success("Added to accumulator slip");
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2"><Target className="h-5 w-5" />{closed ? "Trading closed" : "Trade"}</CardTitle>
        <CardDescription>Each share pays £1 if it hits</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {!isSignedIn && <Alert><AlertTriangle className="h-4 w-4" /><AlertDescription><Link className="underline" href="/sign-in">Sign in</Link> to trade</AlertDescription></Alert>}
        {settled(market) && (
          <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
            <Award className="h-4 w-4 text-green-600" />
            <AlertDescription>{market.status === "void" ? "Voided: trades refunded at cost." : <>Resolved <strong>{market.resolution?.toUpperCase()}</strong></>}</AlertDescription>
          </Alert>
        )}
        <Tabs value={action} onValueChange={setAction}>
          <TabsList className="grid grid-cols-2 w-full"><TabsTrigger value="buy">Buy</TabsTrigger><TabsTrigger value="sell">Sell</TabsTrigger></TabsList>
        </Tabs>
        <div className="grid grid-cols-2 gap-2">
          <Button disabled={closed} onClick={() => setSide("yes")} variant={side === "yes" ? "default" : "outline"}
            className={`h-14 ${side === "yes" ? "bg-green-400 hover:bg-green-500 text-black" : "border-green-200 text-green-500"}`}>
            <div className="flex flex-col"><span className="font-bold">YES</span><span className="text-xs">{formatPrice(market.yesPrice)}</span></div>
          </Button>
          <Button disabled={closed} onClick={() => setSide("no")} variant={side === "no" ? "default" : "outline"}
            className={`h-14 ${side === "no" ? "bg-red-500 hover:bg-red-500 text-white" : "border-red-200 text-red-400"}`}>
            <div className="flex flex-col"><span className="font-bold">NO</span><span className="text-xs">{formatPrice(market.noPrice)}</span></div>
          </Button>
        </div>
        {action === "buy" && (
          <div className="flex gap-2 text-xs">
            <button className={`px-2 py-1 rounded ${mode === "shares" ? "bg-muted" : ""}`} onClick={() => setMode("shares")}>By shares</button>
            <button className={`px-2 py-1 rounded ${mode === "spend" ? "bg-muted" : ""}`} onClick={() => setMode("spend")}>By £ amount</button>
          </div>
        )}
        <div className="space-y-1">
          <label className="text-sm">{action === "buy" && mode === "spend" ? "Spend (£)" : "Shares"}</label>
          <input type="number" min="0" step={mode === "spend" && action === "buy" ? "1" : "1"} value={amount} onChange={(e) => setAmount(e.target.value)}
            disabled={closed} className="w-full h-10 rounded-md border bg-transparent px-3" />
          {action === "sell" && <p className="text-xs text-muted-foreground">You hold {held} {side.toUpperCase()}</p>}
        </div>
        {quote && (
          <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
            <div className="flex justify-between"><span>Shares</span><span>{quote.shares}</span></div>
            <div className="flex justify-between"><span>Avg price</span><span>{formatPrice(quote.avgPrice)}</span></div>
            <div className="flex justify-between"><span>Fee</span><span>{formatPence(quote.feePence)}</span></div>
            <div className="flex justify-between font-semibold"><span>{action === "buy" ? "Total cost" : "You receive"}</span><span>{formatPence(quote.netPence)}</span></div>
            {action === "buy" && <div className="flex justify-between"><span>Pays if {side.toUpperCase()}</span><span>{formatPence(Math.floor(quote.shares * 100))}</span></div>}
            <div className="flex justify-between text-muted-foreground"><span>Price after</span><span>{formatPrice(quote.priceAfter)}</span></div>
          </div>
        )}
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button className="w-full" disabled={!isSignedIn || closed || !quote || busy} onClick={submit}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : `${action === "buy" ? "Buy" : "Sell"} ${side.toUpperCase()}`}
        </Button>
        <Button variant="outline" className="w-full" disabled={closed} onClick={slip}><Layers className="h-4 w-4 mr-2" />Add {side.toUpperCase()} to accumulator</Button>
      </CardContent>
    </Card>
  );
}

export default function BidPage() {
  const { id } = useParams();
  const { user, isSignedIn } = useUser();
  const [market, setMarket] = useState(null);
  const [history, setHistory] = useState([]);
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const socket = useRef(null);

  const load = async () => {
    try {
      const [{ market: m }, { history: h }] = await Promise.all([api.market(id), api.history(id)]);
      setMarket(m);
      setHistory(h);
    } catch {
      setMarket(null);
    } finally {
      setLoading(false);
    }
  };
  const loadPortfolio = async () => {
    if (!getToken()) return setPortfolio(null);
    try { setPortfolio(await api.portfolio()); } catch { setPortfolio(null); }
  };

  useEffect(() => { load(); }, [id]);
  useEffect(() => { loadPortfolio(); }, [id, isSignedIn]);

  useEffect(() => {
    const s = io(BASE_URL, { transports: ["websocket", "polling"] });
    socket.current = s;
    s.on("connect", () => {
      setConnected(true);
      s.emit("joinMarket", id);
      const t = getToken();
      if (t) s.emit("auth", t);
    });
    s.on("disconnect", () => setConnected(false));
    s.on("priceUpdate", (d) => {
      if (d.marketId !== id) return;
      setMarket((m) => m && { ...m, yesPrice: d.pYes, noPrice: d.pNo });
      setHistory((h) => [...h, { t: new Date().toISOString(), pYes: d.pYes }]);
    });
    s.on("balanceUpdate", () => refreshUser());
    s.on("marketStatus", (d) => { if (d.marketId === id) { load(); loadPortfolio(); } });
    return () => { s.emit("leaveMarket", id); s.disconnect(); };
  }, [id, isSignedIn]);

  const onTraded = () => { refreshUser(); loadPortfolio(); };

  const position = { yes: 0, no: 0 };
  (portfolio?.positions || []).filter((p) => p.marketId === id).forEach((p) => { position[p.side] = p.shares; });
  const myTrades = (portfolio?.trades || []).filter((t) => t.marketId === id);

  const runAi = async () => {
    setAiLoading(true);
    try {
      const res = await fetch("/api/gemini/predict", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: market.title, optionA: "Yes", optionB: "No",
          context: `Premier League gameweek ${market.gameweek}. Current market price for YES is ${formatPrice(market.yesPrice)}.`, marketNews: "" }),
      });
      const j = await res.json();
      setAiResult(j?.data ?? j);
    } catch {
      setAiResult({ error: "AI request failed" });
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen"><div className="container mx-auto pt-24 px-4 grid lg:grid-cols-3 gap-6">
        <Skeleton className="h-96 lg:col-span-2" /><Skeleton className="h-96" />
      </div></div>
    );
  }
  if (!market) {
    return <div className="min-h-screen pt-32 text-center text-muted-foreground">Market not found. <Link className="underline" href="/bid">Back to markets</Link></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <div className="container mx-auto pt-24 pb-10 px-4 max-w-7xl">
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-6 flex flex-col lg:flex-row justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary">{market.stat.replace(/_/g, " ")}</Badge>
                    <Badge variant="outline">Gameweek {market.gameweek}</Badge>
                    {connected ? <Wifi className="h-4 w-4 text-green-500" /> : <WifiOff className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  <h1 className="text-2xl md:text-3xl font-bold mb-4">{market.title}</h1>
                  <Badge variant="outline" className="flex w-fit items-center gap-1"><Clock className="h-3 w-3" />Kick-off {new Date(market.kickoff).toLocaleString()}</Badge>
                </div>
                <Card className="w-full lg:w-72">
                  <CardContent className="p-4 text-center space-y-1">
                    <div className="text-sm text-muted-foreground">{user ? `Hi, ${user.firstName}` : "Virtual balance"}</div>
                    <div className="text-2xl font-bold">{user ? formatPence(user.balancePence) : "—"}</div>
                    {user && user.balancePence < 1000 && (
                      <Button size="sm" onClick={async () => { try { await api.topUp(); refreshUser(); toast.success("Balance topped up"); } catch (e) { toast.error(e.message); } }}>Top up</Button>
                    )}
                  </CardContent>
                </Card>
              </CardContent>
            </Card>

            <PriceChart history={history} current={market.yesPrice} />
            <Ladder market={market} />

            <Tabs defaultValue="activity" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="activity" className="flex items-center gap-2"><History className="h-4 w-4" />Your activity</TabsTrigger>
                <TabsTrigger value="ai-analysis" className="flex items-center gap-2"><Bot className="h-4 w-4" />AI Analysis</TabsTrigger>
                <TabsTrigger value="discussion" className="flex items-center gap-2"><MessageCircle className="h-4 w-4" />Discussion</TabsTrigger>
              </TabsList>
              <TabsContent value="activity">
                <Card><CardContent className="p-4">
                  {!isSignedIn ? <p className="text-sm text-muted-foreground">Sign in to see your trades.</p> : myTrades.length === 0 ? <p className="text-sm text-muted-foreground">No trades on this market yet.</p> : (
                    <Table>
                      <TableHeader><TableRow><TableHead>When</TableHead><TableHead>Action</TableHead><TableHead>Shares</TableHead><TableHead>Avg</TableHead><TableHead>Total</TableHead></TableRow></TableHeader>
                      <TableBody>{myTrades.map((t) => (
                        <TableRow key={t._id}><TableCell>{new Date(t.createdAt).toLocaleString()}</TableCell>
                          <TableCell>{t.action} {t.side.toUpperCase()}</TableCell><TableCell>{t.shares}</TableCell>
                          <TableCell>{formatPrice(t.avgPrice)}</TableCell><TableCell>{formatPence(t.netPence)}</TableCell></TableRow>))}</TableBody>
                    </Table>)}
                </CardContent></Card>
              </TabsContent>
              <TabsContent value="ai-analysis" className="space-y-4">
                <Card>
                  <CardHeader><div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5" />Realtime AI Market Analysis</CardTitle>
                    <Button onClick={runAi} disabled={aiLoading}>{aiLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}Run AI Analysis</Button>
                  </div></CardHeader>
                  <CardContent>
                    {aiResult && !aiResult.error && <AIResultsCard result={aiResult} />}
                    {aiResult?.error && <Alert variant="destructive"><XCircle className="h-4 w-4" /><AlertDescription>Failed to analyze: {aiResult.error}</AlertDescription></Alert>}
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="discussion"><Card><CardContent className="p-6 text-muted-foreground">Discuss with other people using comments. (Coming Soon...)</CardContent></Card></TabsContent>
            </Tabs>
          </div>

          <aside className="space-y-6">
            <OrderPanel market={market} position={position} onTraded={() => { onTraded(); load(); }} isSignedIn={isSignedIn} />
            <Card>
              <CardHeader><CardTitle className="text-sm">Market info</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span>YES</span><Badge className="bg-green-100 text-green-800">{formatPrice(market.yesPrice)}</Badge></div>
                <div className="flex justify-between"><span>NO</span><Badge className="bg-red-100 text-red-800">{formatPrice(market.noPrice)}</Badge></div>
                <div className="flex justify-between"><span>Volume</span><span className="font-semibold">{formatPence(market.volumePence)}</span></div>
                <div className="flex justify-between"><span>Your position</span><span>{position.yes ? `${position.yes} YES ` : ""}{position.no ? `${position.no} NO` : ""}{!position.yes && !position.no ? "—" : ""}</span></div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}
