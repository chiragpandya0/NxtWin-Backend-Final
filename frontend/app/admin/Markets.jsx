"use client";
import { useState } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { api } from "../utils/api";
import { formatPence, formatPrice } from "../utils/pricing";
import { act, inputCls, useAdminGet } from "./hooks";

export default function Markets() {
  const [status, setStatus] = useState("");
  const [data, reload] = useAdminGet(`/markets${status ? `?status=${status}` : ""}`);
  const [edit, setEdit] = useState({});

  const setSt = (id, s) => act(() => api.admin.post(`/markets/${id}/status`, { status: s }), `Market ${s}`, reload);
  const saveDraft = (m) => act(() => api.admin.put(`/markets/${m.id}`, { ...(edit[m.id]?.b && { b: Number(edit[m.id].b) }), ...(edit[m.id]?.p && { openProb: Number(edit[m.id].p) / 100 }) }), "Updated", reload);
  const correct = (m) => {
    const r = window.prompt("Correct result to (yes / no / void):");
    if (["yes", "no", "void"].includes(r)) act(() => api.admin.post(`/markets/${m.id}/settle`, { resolution: r }), "Settlement applied", reload);
  };

  return (
    <div className="mt-4 space-y-3">
      <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="">All statuses</option>{["draft", "open", "suspended", "closed", "resolved", "void"].map((s) => <option key={s}>{s}</option>)}</select>
      <Card><CardContent className="p-2 overflow-x-auto">
        <Table><TableHeader><TableRow><TableHead>Market</TableHead><TableHead>Status</TableHead><TableHead>YES</TableHead><TableHead>Open / b</TableHead><TableHead>Vol</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
          <TableBody>{(data?.markets || []).map((m) => (
            <TableRow key={m.id}><TableCell>{m.title}</TableCell>
              <TableCell><Badge variant="outline">{m.status}</Badge>{m.resolution && <Badge className="ml-1">{m.resolution}</Badge>}</TableCell>
              <TableCell>{formatPrice(m.yesPrice)}</TableCell>
              <TableCell>{m.status === "draft" ? (
                <span className="flex gap-1"><input className={`${inputCls} w-16`} placeholder={`${Math.round(m.openProb * 100)}%`} onChange={(e) => setEdit({ ...edit, [m.id]: { ...edit[m.id], p: e.target.value } })} />
                  <input className={`${inputCls} w-16`} placeholder={`b ${m.b}`} onChange={(e) => setEdit({ ...edit, [m.id]: { ...edit[m.id], b: e.target.value } })} />
                  <Button size="sm" variant="outline" onClick={() => saveDraft(m)}>Save</Button></span>) : `${Math.round(m.openProb * 100)}% / b ${m.b} (max loss £${m.maxLoss.toFixed(0)})`}</TableCell>
              <TableCell>{formatPence(m.volumePence)}</TableCell>
              <TableCell className="space-x-1 whitespace-nowrap">
                {["draft", "suspended", "closed"].includes(m.status) && <Button size="sm" variant="outline" onClick={() => setSt(m.id, "open")}>Open</Button>}
                {m.status === "open" && <Button size="sm" variant="outline" onClick={() => setSt(m.id, "suspended")}>Suspend</Button>}
                {["open", "suspended", "closed"].includes(m.status) && <Button size="sm" variant="destructive" onClick={() => window.confirm("Void and refund this market?") && act(() => api.admin.post(`/markets/${m.id}/void`), "Voided", reload)}>Void</Button>}
                {["resolved", "void"].includes(m.status) && <Button size="sm" variant="outline" onClick={() => correct(m)}>Correct</Button>}
              </TableCell></TableRow>))}</TableBody></Table>
      </CardContent></Card>
    </div>
  );
}
