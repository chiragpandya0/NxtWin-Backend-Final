"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { api } from "../utils/api";
import { act, inputCls, useAdminGet } from "./hooks";

const LABELS = {
  feeRate: "Trade fee (0.02 = 2%)", defaultB: "Default liquidity b (new markets)", minProb: "Min offered probability", maxProb: "Max offered probability",
  maxAccaPayoutPence: "Max accumulator payout (pence)", sameMatchDiscount: "Same-match discount per extra leg", startingBalancePence: "Starting balance (pence)",
  topUpBelowPence: "Top-up allowed below (pence)", topUpToPence: "Top-up to (pence)", minMinutesSample: "Min minutes sample for pricing",
  maxTradeShares: "Max shares per trade", voidPostponeHours: "Void if postponed beyond (hours)",
};

export default function SettingsPanel() {
  const [data, reload] = useAdminGet("/settings");
  const [vals, setVals] = useState({});
  useEffect(() => { if (data) setVals(data.settings); }, [data]);
  const save = () => act(() => api.admin.put("/settings", Object.fromEntries(Object.keys(LABELS).map((k) => [k, Number(vals[k])]))), "Settings saved", reload);
  return (
    <Card className="mt-4"><CardHeader><CardTitle>Settings</CardTitle><p className="text-sm text-muted-foreground">Liquidity b only applies to markets generated after the change; edit a draft market to change its own b.</p></CardHeader>
      <CardContent className="grid sm:grid-cols-2 gap-3">
        {Object.entries(LABELS).map(([k, label]) => (
          <label key={k} className="text-sm space-y-1 block"><span>{label}</span>
            <input className={`${inputCls} w-full`} type="number" step="any" value={vals[k] ?? ""} onChange={(e) => setVals({ ...vals, [k]: e.target.value })} /></label>))}
        <div className="sm:col-span-2"><Button onClick={save}>Save settings</Button></div>
      </CardContent></Card>
  );
}
