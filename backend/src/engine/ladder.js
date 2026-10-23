// Ladder consistency: P(over L1) >= P(over L2) for L1 < L2.
// Input: markets for one fixture/subject/stat as [{ line, p }]; returns the minimal changes.
// Markets that break order are moved just far enough to restore it (nearest-violation pooling).

const repairLadder = (rows, { pinned = null } = {}) => {
  const sorted = [...rows].sort((a, b) => a.line - b.line);
  const adjusted = sorted.map((r) => ({ ...r, target: r.p }));
  // Pass up then down so a trade on one rung drags only the rungs that violate order.
  const pivot = pinned == null ? null : adjusted.findIndex((r) => r.id === pinned);
  if (pivot != null && pivot >= 0) {
    for (let i = pivot + 1; i < adjusted.length; i++) {
      if (adjusted[i].target > adjusted[i - 1].target) adjusted[i].target = adjusted[i - 1].target;
    }
    for (let i = pivot - 1; i >= 0; i--) {
      if (adjusted[i].target < adjusted[i + 1].target) adjusted[i].target = adjusted[i + 1].target;
    }
  } else {
    for (let i = 1; i < adjusted.length; i++) {
      if (adjusted[i].target > adjusted[i - 1].target) adjusted[i].target = adjusted[i - 1].target;
    }
  }
  return adjusted.filter((r) => Math.abs(r.target - r.p) > 1e-9).map((r) => ({ id: r.id, from: r.p, to: r.target }));
};

module.exports = { repairLadder };
