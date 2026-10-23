"use client";

import { useEffect, useState } from "react";

const KEY = "gaffr_slip";
const EVENT = "gaffr-slip-change";

const read = () => {
  try {
    return JSON.parse(window.localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
};
const write = (legs) => {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(legs));
  } catch {}
  window.dispatchEvent(new Event(EVENT));
};

// Accumulator slip: 2 to 6 legs, one per market.
export const addLeg = (leg) => {
  const legs = read().filter((l) => l.marketId !== leg.marketId);
  if (legs.length >= 6) throw new Error("An accumulator can have at most 6 legs");
  write([...legs, leg]);
};
export const removeLeg = (marketId) => write(read().filter((l) => l.marketId !== marketId));
export const clearSlip = () => write([]);

export function useSlip() {
  const [legs, setLegs] = useState([]);
  useEffect(() => {
    const sync = () => setLegs(read());
    sync();
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, []);
  return legs;
}
