import { useCallback, useEffect, useState } from 'react';

export const useTodayOps = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL?.trim() || '';

  const buildUrl = (path) => {
    const base = API_URL.replace(/\/$/, '');
    return base ? `${base}${path}` : path;
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem('admin_token') || localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  };

  const fetchTodayOps = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(buildUrl('/api/admin/ops/today'), { headers: getAuthHeaders() });
      const json = await res.json();
      if (res.ok && json.success) {
        setData(json.data);
      } else {
        console.error('Today ops error:', json.error || json.message);
      }
    } catch (err) {
      console.error('Today ops fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [API_URL]);

  useEffect(() => {
    fetchTodayOps();
  }, [fetchTodayOps]);

  return { isLoading, data, refetch: fetchTodayOps };
};

