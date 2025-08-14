"use client";
import React, { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatINRCompact } from "../utils/formatters";
import SpotlightCard from "../components/SpotlightCard";

export default function Page() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("All");
  const [minAmount, setMinAmount] = useState(0);
  const [maxAmount, setMaxAmount] = useState(2000);
  const [sortBy, setSortBy] = useState("relevance");
  const [selected, setSelected] = useState(null);
  const [viewMode, setViewMode] = useState("grid");

  // Load data from backend
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        // Fetch bids data from the backend
        const bidsResponse = await fetch(
          "https://nxtwin-backend-final.onrender.com/api/get/bids"
        ).then((res) => res.json());

        // Transform backend data to match frontend format
        const transformedBids = bidsResponse.bids.map((bid) => {
          // Calculate No price (complement of Yes price)
          const yesPrice = bid.yesPrice;
          const noPrice = 10 - yesPrice;

          return {
            id: bid._id,
            question: bid.question,
            category: bid.category,
            optionA: "Yes", // Default label for option A
            optionB: "No", // Default label for option B
            yesPrice: yesPrice,
            volume: bid.volume,
            participants: 0, // Placeholder - backend needs to track this
            deadline: new Date(bid.endTime).toLocaleString(),
            image: bid.image,
            // Add status and resolution fields
            status: bid.status || "active",
            resolution: bid.resolution || null,
            resolvedAt: bid.resolvedAt || null,
          };
        });

        setData(transformedBids);
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(data.map((d) => d.category)))],
    [data]
  );

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    let r = data.filter((m) => {
      if (category !== "All" && m.category !== category) return false;
      if (m.volume < minAmount || m.volume > maxAmount) return false; // Corrected 'amount' to 'volume'
      if (!ql) return true;
      return (
        m.question.toLowerCase().includes(ql) || // Corrected 'title' to 'question'
        m.optionA.toLowerCase().includes(ql) ||
        m.optionB.toLowerCase().includes(ql) ||
        m.category.toLowerCase().includes(ql)
      );
    });
    if (sortBy === "amount-desc") r = r.sort((a, b) => b.volume - a.volume);
    // Corrected 'amount' to 'volume'
    else if (sortBy === "amount-asc") r = r.sort((a, b) => a.volume - b.volume);
    // Corrected 'amount' to 'volume'
    else if (sortBy === "newest")
      r = r.sort((a, b) => new Date(b.date) - new Date(a.date)); // 'date' is removed, but keeping the sort to prevent errors. You can replace this with sorting by _id or a new created_at field if needed.
    return r;
  }, [data, q, category, minAmount, maxAmount, sortBy]);

  const resetFilters = () => {
    setQ("");
    setCategory("All");
    setMinAmount(0);
    setMaxAmount(2000);
    setSortBy("relevance");
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-[#030712] text-slate-100 flex items-center justify-center">
        <div className="text-xl">Loading markets...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#030712] text-slate-100 selection:bg-cyan-300 selection:text-black">
      {/* Background gradients */}
      <div className="pointer-events-none fixed inset-0 opacity-60">
        <div className="absolute inset-0 bg-[radial-gradient(1100px_500px_at_15%_-10%,rgba(0,255,200,0.07),transparent),radial-gradient(1000px_500px_at_85%_110%,rgba(120,60,255,0.08),transparent)]" />
      </div>

      {/* Header with search and filters */}
      <div className="sticky top-0 z-30 border-b border-white/10 backdrop-blur-xl bg-[#030712]/60">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2 flex-1 rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-2">
            <svg
              className="h-4 w-4 text-slate-400"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M21 21l-4.3-4.3M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search markets..."
              className="bg-transparent outline-none placeholder:text-slate-500 text-slate-100 w-full"
            />
            <button
              onClick={resetFilters}
              className="text-xs px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 transition"
            >
              Reset
            </button>
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="hidden sm:block rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm"
          >
            <option value="relevance">Relevance</option>
            <option value="amount-desc">Volume (High → Low)</option>
            <option value="amount-asc">Volume (Low → High)</option>
            <option value="newest">Newest</option>
          </select>
        </div>

        <div className="max-w-[1600px] mx-auto px-4 md:px-6 pb-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl">
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`px-3 py-1.5 rounded-full text-sm border ${
                    category === c
                      ? "border-emerald-400/60 bg-emerald-300/10 text-emerald-200 shadow-[0_0_24px_rgba(16,185,129,0.25)]"
                      : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.08]"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4"></div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-6">
        <div className="mb-4 text-sm text-slate-400">
          {filtered.length} markets
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            No markets found
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
            {filtered.map((m) => (
              <CardGrid
                key={m.id}
                market={m}
                selected={selected === m.id}
                onSelect={() => setSelected((s) => (s === m.id ? null : m.id))}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- atoms ---------- */

function Tab({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-sm transition ${
        active
          ? "bg-gradient-to-r from-teal-300 to-cyan-300 text-black shadow-[0_8px_30px_-8px_rgba(45,212,191,0.6)]"
          : "bg-white/5 text-slate-300 hover:bg-white/10"
      }`}
    >
      {label}
    </button>
  );
}

function Chip({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 text-sm rounded-full border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 backdrop-blur transition"
    >
      {label}
    </button>
  );
}

function Badge({ children }) {
  return (
    <div className="px-2.5 py-1 rounded-lg border border-white/10 bg-white/[0.05] backdrop-blur text-slate-300">
      {children}
    </div>
  );
}

function ProgressPulse({ value = 50 }) {
  return (
    <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden relative">
      <div
        style={{ width: `${value}%` }}
        className="h-full bg-gradient-to-r from-emerald-300 via-teal-300 to-cyan-300 transition-[width] duration-300"
      />
      <div className="absolute inset-0 pointer-events-none [mask-image:radial-gradient(60%_50%_at_30%_50%,black,transparent)] bg-white/20 mix-blend-overlay" />
    </div>
  );
}

/* ---------- cards (no channel/owner in grid) ---------- */

function CardGrid({ market, selected, onSelect }) {
  const volCompact = formatINRCompact(market.volume);
  const yesPrice = market.yesPrice;
  const noPrice = 10 - yesPrice;

  // Convert price (0.5 to 9.5) to a percentage (5% to 95%)
  const yesShare = yesPrice * 10;

  // Check if prices are defined before displaying
  const displayYesPrice = yesPrice ? `₹${yesPrice.toFixed(2)}` : "N/A";
  const displayNoPrice = noPrice ? `₹${noPrice.toFixed(2)}` : "N/A";

  // Check if event is resolved
  const isResolved = market.status === "resolved";

  return (
    <SpotlightCard
      className="!p-2 !m-0"
      spotlightColor="rgba(0, 229, 255, 0.35)"
    >
      <div
        className={`rounded-2xl border ${
          selected ? "border-emerald-300/60" : "border-white/10"
        } bg-white/[0.06] backdrop-blur-xl shadow-[0_20px_80px_-20px_rgba(0,0,0,0.6)] overflow-hidden`}
      >
        <Link href={`/bid/${market.id}`} className="block">
          <div className="relative aspect-[16/9] bg-slate-900">
            {market.image ? (
              <Image
                src={market.image}
                alt={market.question}
                fill
                className="object-cover opacity-85"
                sizes="(max-width:768px) 100vw, 33vw"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                <div className="text-gray-400 text-sm">No image</div>
              </div>
            )}

            <div className="absolute top-2 left-2 text-[11px] px-2 py-1 rounded-md border border-white/10 bg-black/40 backdrop-blur text-slate-200">
              {market.category}
            </div>

            {/* Resolved badge overlay */}
            {isResolved && (
              <div className="absolute top-2 right-2 text-[11px] px-2 py-1 rounded-md border border-green-400/50 bg-green-500/20 backdrop-blur text-green-300">
                Resolved
              </div>
            )}
          </div>
        </Link>

        <div className="p-3 space-y-2.5">
          <h3 className="text-[15px] font-semibold leading-snug text-slate-100 line-clamp-2">
            {market.question}
          </h3>

          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-slate-300 truncate">
              <span className="text-xs text-slate-300">Vol: ₹{volCompact}</span>
            </div>
          </div>

          {/* Conditional rendering based on resolved status */}
          {isResolved ? (
            <div className="rounded-lg border border-green-400/30 bg-green-400/10 px-3 py-2 text-center">
              <div className="text-green-300 font-medium text-sm mb-1">
                Event Resolved
              </div>
              <div className="text-green-200 text-xs">
                Winner:{" "}
                <span className="font-semibold">{market.resolution}</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 flex items-center justify-between">
                <span className="text-emerald-300 font-medium">
                  {market.optionA}
                </span>
                <span className="text-emerald-200 tabular-nums">
                  {displayYesPrice}
                </span>
              </div>
              <div className="flex-1 rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 flex items-center justify-between">
                <span className="text-red-400 font-medium">
                  {market.optionB}
                </span>
                <span className="text-red-300 tabular-nums">
                  {displayNoPrice}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </SpotlightCard>
  );
}
