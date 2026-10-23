// Shares pay £1, so a price is a probability between 0 and 1.
export const PRICING_CONFIG = { MAX_PAYOUT: 1 };

export const formatPence = (pence) => `£${((pence || 0) / 100).toFixed(2)}`;

// 0.462 -> "46p"
export const formatPrice = (p) =>
  p == null || Number.isNaN(p) ? "—" : `${Math.round(p * 100)}p`;

export const formatPercent = (p) =>
  p == null || Number.isNaN(p) ? "—" : `${(p * 100).toFixed(1)}%`;
