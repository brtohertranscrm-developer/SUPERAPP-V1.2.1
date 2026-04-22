import { useState, useEffect, useCallback } from 'react';

export const useDashboard = ({ period = '7d' } = {}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    period: period,
    periodLabel: '',
    // revenue: backward-compatible alias (paid revenue)
    revenue: 0,
    revenue_paid: 0,
    revenue_gross: 0,
    paid_bookings: 0,
    pending_payment_count: 0,
    pending_payment_amount: 0,
    activeBookings: 0,
    activeMotors: 0,
    activeLockers: 0,
    pendingKyc: 0,
  });
  const [recentBookings, setRecentBookings] = useState([]);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL?.trim() || '';

  const buildUrl = (path, query = {}) => {
    const base = API_URL.replace(/\/$/, '');
    const url = base ? `${base}${path}` : path; // allow Vite proxy when base is empty
    const qs = new URLSearchParams(
      Object.fromEntries(
        Object.entries(query).filter(([, v]) => v !== undefined && v !== null && String(v) !== '')
      )
    ).toString();
    return qs ? `${url}?${qs}` : url;
  };

  // 1. PERBAIKAN: Utamakan 'admin_token' agar tidak tertukar dengan token User
  const getAuthHeaders = () => {
    const token = localStorage.getItem('admin_token') || localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 2. Tembak API Stats
      const resStats = await fetch(buildUrl('/api/admin/stats', { period: String(period || '7d') }), {
        headers: getAuthHeaders() 
      });
      const dataStats = await resStats.json();
      
      if (!resStats.ok) {
         console.error("API Stats Ditolak:", dataStats.error || dataStats.message);
      } else if (dataStats.success) {
         setStats((prev) => ({
           ...prev,
           ...dataStats.data,
           period: dataStats.data?.period || String(period || '7d'),
         }));
         setLastUpdatedAt(Date.now());
      }

      // 3. Tembak API Bookings
      const resBookings = await fetch(buildUrl('/api/admin/bookings'), {
        headers: getAuthHeaders() 
      });
      const dataBookings = await resBookings.json();
      
      if (dataBookings.success) {
         setRecentBookings(dataBookings.data.slice(0, 4));
      }
    } catch (error) {
      console.error('Gagal mengambil data dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  }, [API_URL, period]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const formatRupiah = (angka) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(angka || 0);
  };

  return { isLoading, stats, recentBookings, formatRupiah, lastUpdatedAt, refetch: fetchDashboardData };
};
