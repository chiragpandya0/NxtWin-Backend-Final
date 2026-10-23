"use client";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "../utils/api";

// Load an admin GET endpoint; returns [data, reload, loading].
export function useAdminGet(path) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    setLoading(true);
    try { setData(await api.admin.get(path)); } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  }, [path]);
  useEffect(() => { reload(); }, [reload]);
  return [data, reload, loading];
}

// Run an admin action with toast feedback, then call `after`.
export const act = async (fn, ok, after) => {
  try {
    const r = await fn();
    toast.success(typeof ok === "function" ? ok(r) : ok);
    if (after) await after();
    return r;
  } catch (e) {
    toast.error(e.message);
  }
};

export const inputCls = "h-9 rounded-md border bg-transparent px-2 text-sm";
