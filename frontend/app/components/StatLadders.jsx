"use client";
import Link from "next/link";

export const STAT_ORDER = ["shots", "shots_on_target", "goals", "assists", "tackles", "key_passes"];
export const statLabel = (s) => s.replace(/_/g, " ");

// Build [{stat,label,lines:[{marketId,line,yesPrice,status}]}] from a flat markets list.
export const toStats = (markets) => {
  const by = new Map();
  for (const m of markets) {
    if (!by.has(m.stat)) by.set(m.stat, []);
    by.get(m.stat).push({ marketId: m.id, line: m.line, yesPrice: m.yesPrice, status: m.status, resolution: m.resolution });
  }
  return [...by.entries()]
    .sort((a, b) => (STAT_ORDER.indexOf(a[0]) + 1 || 99) - (STAT_ORDER.indexOf(b[0]) + 1 || 99))
    .map(([stat, lines]) => ({ stat, label: statLabel(stat), lines: lines.sort((a, b) => a.line - b.line) }));
};

// One row per stat; each line is a chip showing the YES price. Click opens that market.
export default function StatLadders({ stats, activeId, compact = false }) {
  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      {stats.map((s) => (
        <div key={s.stat}>
          <div className="text-[11px] uppercase tracking-wide text-slate-400 mb-1">{s.label}</div>
          <div className="flex flex-wrap gap-1.5">
            {s.lines.map((l) => {
              const settled = ["resolved", "void"].includes(l.status);
              const p = Math.round(l.yesPrice * 100);
              const active = l.marketId === activeId;
              return (
                <Link
                  key={l.marketId}
                  href={`/bid/${l.marketId}`}
                  title={`Over ${l.line}: YES ${p}p / NO ${100 - p}p`}
                  style={settled ? undefined : { backgroundColor: `rgba(16,185,129,${0.06 + l.yesPrice * 0.22})` }}
                  className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm transition hover:border-emerald-300/70 ${
                    active ? "border-emerald-300" : "border-white/10"
                  } ${settled ? "bg-white/5 text-slate-400" : ""}`}
                >
                  <span className="text-slate-300">Over {l.line}</span>
                  <span className="font-semibold tabular-nums text-emerald-200">
                    {settled ? (l.status === "void" ? "void" : l.resolution?.toUpperCase()) : `${p}p`}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
