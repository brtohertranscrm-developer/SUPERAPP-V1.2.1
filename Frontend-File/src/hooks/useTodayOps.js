import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../utils/api';

export const useTodayOps = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState(null);

  const fetchTodayOps = useCallback(async () => {
    setIsLoading(true);
    try {
      const json = await apiFetch('/api/admin/ops/today');
      setData(json?.data || null);
    } catch (err) {
      // Endpoint ops/today mungkin belum tersedia di backend.
      if (err?.status === 404) {
        setData(null);
      } else {
        console.error('Today ops fetch error:', err);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTodayOps();
  }, [fetchTodayOps]);

  return { isLoading, data, refetch: fetchTodayOps };
};
