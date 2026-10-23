"use client";
import { useState } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { api } from "../utils/api";
import { formatPence } from "../utils/pricing";
import { act, useAdminGet } from "./hooks";

export default function Users() {
  const [data, reload] = useAdminGet("/users");
  const [ledger, setLedger] = useState(null);

  const showLedger = async (u) => setLedger({ user: u, ...(await api.admin.get(`/users/${u._id}/ledger`)) });
  const adjust = (u) => {
    const amt = window.prompt(`Adjust ${u.email} balance by (£, negative to debit):`);
    const reason = amt && window.prompt("Reason:");
    if (amt && reason) act(() => api.admin.post(`/users/${u._id}/adjust`, { amountPence: Math.round(Number(amt) * 100), reason }), "Balance adjusted", reload);
  };

  return (
    <div className="mt-4 space-y-4">
      <Card><CardContent className="p-2 overflow-x-auto"><Table>
        <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Role</TableHead><TableHead>Balance</TableHead><TableHead>Joined</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
        <TableBody>{(data?.users || []).map((u) => (
          <TableRow key={u._id}><TableCell>{u.name} <span className="text-muted-foreground">{u.email}</span>{u.suspended && <Badge variant="destructive" className="ml-2">suspended</Badge>}</TableCell>
            <TableCell>{u.role}</TableCell><TableCell>{formatPence(u.balancePence)}</TableCell><TableCell>{new Date(u.createdAt).toLocaleDateString()}</TableCell>
            <TableCell className="space-x-1 whitespace-nowrap">
              <Button size="sm" variant="outline" onClick={() => showLedger(u)}>Ledger</Button>
              <Button size="sm" variant="outline" onClick={() => adjust(u)}>Adjust</Button>
              <Button size="sm" variant="outline" onClick={() => act(() => api.admin.post(`/users/${u._id}/suspend`, { suspended: !u.suspended }), "Updated", reload)}>{u.suspended ? "Unsuspend" : "Suspend"}</Button>
            </TableCell></TableRow>))}</TableBody></Table></CardContent></Card>
      {ledger && (
        <Card><CardContent className="p-4 space-y-2">
          <div className="flex justify-between"><div className="font-medium">Ledger · {ledger.user.email}</div><Button size="sm" variant="outline" onClick={() => setLedger(null)}>Close</Button></div>
          <div className="text-sm max-h-80 overflow-auto space-y-1">{ledger.entries.map((e) => (
            <div key={e._id} className="flex justify-between"><span>{new Date(e.createdAt).toLocaleString()} · {e.type}</span>
              <span className={e.amountPence >= 0 ? "text-green-500" : "text-red-500"}>{formatPence(e.amountPence)} <span className="text-muted-foreground">→ {formatPence(e.balanceAfter)}</span></span></div>))}</div>
        </CardContent></Card>)}
    </div>
  );
}
