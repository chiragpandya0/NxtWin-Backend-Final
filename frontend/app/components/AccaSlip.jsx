"use client";

import { useEffect, useState } from "react";
import { Layers, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "./ui/sheet";
import { api } from "../utils/api";
import { useSlip, removeLeg, clearSlip } from "../utils/slip";
import { useUser, refreshUser } from "../utils/auth";
import { formatPence, formatPrice } from "../utils/pricing";

// Floating accumulator slip: 2-6 legs, one stake, price locked on placement.
export default function AccaSlip() {
  const legs = useSlip();
  const { isSignedIn } = useUser();
  const [open, setOpen] = useState(false);
  const [stake, setStake] = useState("5");
  const [quote, setQuote] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const stakePence = Math.round(Number(stake) * 100);

  useEffect(() => {
    setQuote(null);
    setError("");
    if (legs.length < 2 || !(stakePence >= 100)) return;
    const t = setTimeout(async () => {
      try {
        const r = await api.accaQuote({ legs: legs.map(({ marketId, side }) => ({ marketId, side })), stakePence });
        setQuote(r.quote);
      } catch (e) {
        setError(e.message);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [legs, stakePence]);

  const place = async () => {
    setBusy(true);
    try {
      await api.accaPlace({ legs: legs.map(({ marketId, side }) => ({ marketId, side })), stakePence });
      toast.success("Accumulator placed");
      clearSlip();
      setOpen(false);
      refreshUser();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!legs.length) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-white shadow-lg hover:bg-emerald-500"
      >
        <Layers className="h-5 w-5" /> Slip <Badge variant="secondary">{legs.length}</Badge>
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Accumulator slip</SheetTitle>
            <SheetDescription>2 to 6 picks. Pays only if every pick hits. Price locks when you place.</SheetDescription>
          </SheetHeader>
          <div className="space-y-3 p-4">
            {legs.map((l) => (
              <div key={l.marketId} className="flex items-start justify-between gap-2 rounded-lg border p-3">
                <div className="text-sm">
                  <div className="font-medium">{l.title}</div>
                  <div className="text-muted-foreground">{l.side.toUpperCase()} @ {formatPrice(l.p)}</div>
                </div>
                <button onClick={() => removeLeg(l.marketId)} aria-label="Remove"><X className="h-4 w-4" /></button>
              </div>
            ))}
            {legs.length < 2 && <p className="text-sm text-muted-foreground">Add at least one more pick.</p>}
            <div className="space-y-1">
              <label className="text-sm">Stake (£)</label>
              <input type="number" min="1" step="1" value={stake} onChange={(e) => setStake(e.target.value)}
                className="w-full h-10 rounded-md border bg-transparent px-3" />
            </div>
            {quote && (
              <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
                <div className="flex justify-between"><span>Fee</span><span>{formatPence(quote.feePence)}</span></div>
                <div className="flex justify-between"><span>Combined chance</span><span>{(quote.combinedP * 100).toFixed(1)}%</span></div>
                <div className="flex justify-between font-semibold"><span>Pays</span><span>{formatPence(quote.payoutPence)}{quote.capped ? " (max)" : ""}</span></div>
              </div>
            )}
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button className="w-full" disabled={!isSignedIn || !quote || busy} onClick={place}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : isSignedIn ? "Place accumulator" : "Sign in to place"}
            </Button>
            <Button variant="outline" className="w-full" onClick={clearSlip}>Clear slip</Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
