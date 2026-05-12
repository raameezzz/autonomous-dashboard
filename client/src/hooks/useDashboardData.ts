import { useEffect, useRef, useState, useCallback } from 'react';
import { api } from '../api/client';
import { DashboardResponse, DateRange } from '../types';

export interface UseDashboardDataResult {
  data: DashboardResponse | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

const POLL_INTERVAL_MS = 60_000;

export function useDashboardData(range: DateRange): UseDashboardDataResult {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cancelledRef = useRef(false);

  const fetchOnce = useCallback(async (signal?: AbortSignal) => {
    try {
      const result = await api.dashboard(range.start, range.end);
      if (!signal?.aborted && !cancelledRef.current) {
        setData(result);
        setError(null);
      }
    } catch (err) {
      if (!signal?.aborted && !cancelledRef.current) {
        setError((err as Error).message);
      }
    } finally {
      if (!cancelledRef.current) setLoading(false);
    }
  }, [range.start, range.end]);

  useEffect(() => {
    cancelledRef.current = false;
    setLoading(true);
    const controller = new AbortController();
    fetchOnce(controller.signal);
    const id = setInterval(() => fetchOnce(controller.signal), POLL_INTERVAL_MS);
    return () => {
      cancelledRef.current = true;
      controller.abort();
      clearInterval(id);
    };
  }, [fetchOnce]);

  const refresh = useCallback(() => {
    setLoading(true);
    fetchOnce();
  }, [fetchOnce]);

  return { data, loading, error, refresh };
}
