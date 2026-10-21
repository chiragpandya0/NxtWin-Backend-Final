export function formatCurrencyCompact(n) {
  if (n >= 1000000000)
    return `${+(n / 1000000000).toFixed(n % 1000000000 ? 1 : 0)}B`;
  if (n >= 1000000) return `${+(n / 1000000).toFixed(n % 1000000 ? 1 : 0)}M`;
  if (n >= 1000) return `${+(n / 1000).toFixed(n % 1000 ? 1 : 0)}K`;
  return `${n}`;
}

export function withRandomVolume(base) {
  const amt =
    typeof base === "number"
      ? base
      : Math.floor(20_000 + Math.random() * 2_000_000);
  const jitter = Math.max(0.9, Math.min(1.2, 0.95 + Math.random() * 0.25));
  return Math.round(amt * jitter);
}

// Derive “prices” from probabilities; tweak as desired
export function getPrices(yesPct) {
  const y = Math.max(1, Math.min(99, yesPct));
  const yes = +(y / 100).toFixed(2); // 0.62 style
  const no = +(1 - yes).toFixed(2); // 0.38 style
  return { yes, no };
}
