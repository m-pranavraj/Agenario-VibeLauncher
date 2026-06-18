import { useState, useEffect } from "react";
import { api, type Scan } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";

export function useScans() {
  const { user } = useAuth();
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setScans([]);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    api.scans
      .list()
      .then((data) => {
        if (active) {
          setScans(data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load scans");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user]);

  return { scans, loading, error };
}
