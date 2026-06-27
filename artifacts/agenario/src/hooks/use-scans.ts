import { useState, useEffect, useRef, useCallback } from "react";
import { api, type Scan } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";

const POLL_INTERVAL_MS = 10000; // Poll every 10 s when scans are running

export function useScans() {
  const { user } = useAuth();
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchScans = useCallback(async (signal?: AbortSignal) => {
    try {
      const data = await api.scans.list();
      if (!signal?.aborted) {
        setScans(data);
        setError(null);
      }
    } catch (err: unknown) {
      if (!signal?.aborted) {
        setError(err instanceof Error ? err.message : "Failed to load scans");
      }
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setScans([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    fetchScans(controller.signal).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });

    // Polling: if any scans are running, re-fetch every POLL_INTERVAL_MS
    pollRef.current = setInterval(async () => {
      const hasRunning = scans.some((s) => s.status === "running");
      if (hasRunning) {
        await fetchScans(controller.signal);
      }
    }, POLL_INTERVAL_MS);

    return () => {
      controller.abort();
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Re-start poll timer whenever scan list changes so we pick up new running scans
  useEffect(() => {
    if (!user) return;
    if (pollRef.current) clearInterval(pollRef.current);
    const hasRunning = scans.some((s) => s.status === "running");
    if (!hasRunning) return;
    pollRef.current = setInterval(() => {
      fetchScans();
    }, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [scans, user, fetchScans]);

  return { scans, loading, error };
}
