"use client";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Users, Timer } from "lucide-react";


export const MarketCard = ({ title, category, deadline, yesShare, participants, volume, balance, onBid }) => {
    const [selected, setSelected] = useState(null);
    const [amount, setAmount] = useState("");

    const noShare = 100 - yesShare;
    const payout = useMemo(() => {
        const amt = Number(amount);
        if (!amt || !selected) return 0;
        const share = selected === "YES" ? yesShare : noShare;
        if (share <= 0) return 0;
        return Math.max(0, Math.round((amt * 100) / share));
    }, [amount, selected, yesShare, noShare]);

    const handleBid = () => {
        const amt = Number(amount);
        if (!selected) {
            toast({ title: "Select an option", description: "Choose YES or NO before bidding." });
            return;
        }
        if (!amt || amt <= 0) {
            toast({ title: "Enter a valid amount", description: "Amount must be greater than 0." });
            return;
        }
        if (amt > balance) {
            toast({ title: "Insufficient balance", description: "Add funds to your wallet to place this bid." });
            return;
        }

        onBid(amt, selected);
        setAmount("");
        toast({ title: "Bid placed", description: `You bid ₹${amt} on ${selected}. Potential payout ₹${payout}.` });
    };

    return (
        <section id="markets" className="animate-enter">
            <Card className="overflow-hidden shadow-lg border-none bg-gradient-to-br from-white via-slate-50 to-slate-100">
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-2xl font-bold text-slate-800">{title}</CardTitle>
                            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                                <Badge variant="secondary" className="rounded-full px-3 py-1">{category}</Badge>
                                <div className="flex items-center gap-1">
                                    <Timer className="h-4 w-4 text-blue-500" />
                                    <span>{deadline}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Users className="h-4 w-4 text-green-500" />
                                    <span>{participants.toLocaleString()} participants</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="text-xs">•</span>
                                    <span>Volume ₹{volume.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {/* Options */}
                    <div className="grid grid-cols-2 gap-4 mt-2">
                        {([
                            { key: "YES", share: yesShare, color: "bg-green-100 border-green-400 text-green-700" },
                            { key: "NO", share: noShare, color: "bg-red-100 border-red-400 text-red-700" },
                        ]).map((opt) => (
                            <button
                                key={opt.key}
                                onClick={() => setSelected(opt.key)}
                                className={`group rounded-xl border-2 p-5 shadow-sm transition-all duration-150 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 ${opt.color} ${selected === opt.key ? "ring-2 ring-offset-2 ring-blue-400 border-blue-400" : "border-transparent"}`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-medium uppercase tracking-wide">{opt.key}</span>
                                    <span className="text-xs bg-white/60 rounded px-2 py-0.5">{opt.share}% market</span>
                                </div>
                                <div className="flex items-end justify-between">
                                    <div className="text-lg font-bold">{opt.key === "YES" ? "👍" : "👎"}</div>
                                    <div className="text-xs text-slate-500">{Math.round((opt.share * participants) / 100)} bids</div>
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Bidding */}
                    <div className="mt-8 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                        <div className="space-y-4">
                            <div className="flex gap-2 flex-wrap">
                                {[10, 50, 100, 250, 500].map(v => (
                                    <Button
                                        key={v}
                                        variant={amount === String(v) ? "premium" : "chip"}
                                        className={`rounded-full px-4 py-2 font-semibold ${amount === String(v) ? "shadow-md" : ""}`}
                                        onClick={() => setAmount(String(v))}
                                    >
                                        ₹{v}
                                    </Button>
                                ))}
                            </div>
                            <Input
                                type="number"
                                placeholder="Enter amount (₹)"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="rounded-lg border-2 border-slate-200 focus:border-blue-400 focus:ring-blue-400"
                            />
                            <div className="text-sm text-slate-500 flex items-center gap-2">
                                <span>Selected:</span>
                                <span className="font-semibold text-slate-700">{selected ?? "—"}</span>
                                <span>• Possible payout:</span>
                                <span className="font-semibold text-green-700">₹{payout}</span>
                            </div>
                        </div>
                        <Button
                            variant="premium"
                            className="md:ml-3 rounded-xl px-6 py-3 text-lg font-bold shadow-lg bg-gradient-to-r from-blue-500 to-green-400 text-white"
                            onClick={handleBid}
                        >
                            Confirm Bid
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </section>
    );
};

export default MarketCard;