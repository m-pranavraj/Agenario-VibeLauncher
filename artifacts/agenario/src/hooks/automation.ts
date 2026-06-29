import { useState } from "react";
import { api } from "../lib/api";

export function useClaimNextRun() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = async (workerId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.automation.claimNextRun(workerId);
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

export function useCreateRun() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = async (data: any) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.automation.createRun(data);
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

export function useGetRunDetail() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = async (runId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.automation.getRunDetail(runId);
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

export function useListRuns() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = async (status?: string, limit?: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.automation.listRuns(status, limit);
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

export function useSubmitWorkerArtifacts() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = async (data: any) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.automation.submitWorkerArtifacts(data);
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
