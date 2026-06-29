import { useState } from "react";
import { api } from "../lib/api";

export function useAnalyzeConsensus() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = async (data: any) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.compiler.analyzeConsensus(data);
      return res;
    } catch (err: any) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { execute, loading, error };
}

export function useGeneratePatch() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = async (data: any) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.compiler.generatePatch(data);
      return res;
    } catch (err: any) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { execute, loading, error };
}
