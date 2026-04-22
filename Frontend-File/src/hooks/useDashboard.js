import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../utils/api';

const parseMoney = (value) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value !== 'string') return 0;
  const normalized = value.replace(/rp/gi, '').replace(/[.\s]/g, '').replace(/,/g, '').trim();
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : 0;
};

const parseDateLike = (value) => {
  if (!value) return null;
  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) return direct;
  if (typeof value === 'string') {
    const normalized = value.replace(' ', 'T');
    const retry = new Date(normalized);
    if (!Number.isNaN(retry.getTime())) return retry;
  }
  return null;
};

const getPeriodLabel = (period) => {
  switch (period) {
    case 'today': return 'Hari Ini';
    case '30d': return '30 Hari Terakhir';
    case 'mtd': return 'Bulan Ini (MTD)';
    case 'ytd': return 'Tahun Ini (YTD)';
    case 'all': return 'Semua Waktu';
    default: return '7 Hari Terakhir';
  }
};

const isWithinPeriod = (date, period) => {
  if (!date) return period === 'all';

  const now = new Date();
  const bookingTime = date.getTime();

  if (period === 'all') return true;

  if (period === 'today') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return bookingTime >= start.getTime();
  }

  if (period === '30d') {
    const start = new Date(now);
    start.setDate(start.getDate() - 30);
    return bookingTime >= start.getTime();
  }

  if (period === 'mtd') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return bookingTime >= start.getTime();
  }

  if (period === 'ytd') {
    const start = new Date(now.getFullYear(), 0, 1);
    return bookingTime >= start.getTime();
  }

  const start = new Date(now);
  start.setDate(start.getDate() - 7);
  return bookingTime >= start.getTime();
};

const computeStatsFromBookings = (bookings = [], period = '7d') => {
  const filtered = bookings.filter((booking) => {
    const ts = parseDateLike(booking.created_at || booking.start_date || booking.startDate);
    return isWithinPeriod(ts, period);
  });

  const revenueGross = filtered.reduce((sum, booking) => {
    const total =
      parseMoney(booking.total_price) ||
      (
        parseMoney(booking.base_price) -
        parseMoney(booking.discount_amount) +
        parseMoney(booking.service_fee) +
        parseMoney(booking.extend_fee) +
        parseMoney(booking.addon_fee) +
        parseMoney(booking.delivery_fee) +
        parseMoney(booking.pickup_fee) +
        parseMoney(booking.drop_fee)
      );
    return sum + Math.max(total, 0);
  }, 0);

  const revenuePaid = filtered.reduce((sum, booking) => {
    if (String(booking.payment_status).toLowerCase() !== 'paid') return sum;
    const paidAmount = parseMoney(booking.paid_amount);
    const total = parseMoney(booking.total_price);
    return sum + (paidAmount > 0 ? paidAmount : total);
  }, 0);

  const pendingRows = filtered.filter((booking) => String(booking.payment_status).toLowerCase() !== 'paid');
  const pendingAmount = pendingRows.reduce((sum, booking) => {
    const total = parseMoney(booking.total_price);
    const paid = parseMoney(booking.paid_amount);
    return sum + Math.max(total - paid, 0);
  }, 0);

  return {
    period,
    periodLabel: getPeriodLabel(period),
    revenue: revenueGross,
    revenue_paid: revenuePaid,
    revenue_gross: revenueGross,
    paid_bookings: filtered.filter((booking) => String(booking.payment_status).toLowerCase() === 'paid').length,
    pending_payment_count: pendingRows.length,
    pending_payment_amount: pendingAmount,
    activeBookings: filtered.filter((booking) => String(booking.status).toLowerCase() === 'active').length,
    activeMotors: filtered.filter((booking) => String(booking.status).toLowerCase() === 'active' && booking.item_type === 'motor').length,
  };
};

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

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      let statsPayload = null;

      // 2. Tembak API Stats
      try {
        const dataStats = await apiFetch(`/api/admin/stats?period=${encodeURIComponent(String(period || '7d'))}`);
        statsPayload = dataStats?.data || null;
      } catch (e) {
        // apiFetch sudah handle auto-logout saat 401.
        console.error('API Stats Ditolak:', e?.message || e);
      }

      // 3. Tembak API Bookings
      const dataBookings = await apiFetch('/api/admin/bookings');
      const bookings = Array.isArray(dataBookings?.data) ? dataBookings.data : [];
      setRecentBookings(bookings.slice(0, 4));

      const fallbackStats = computeStatsFromBookings(bookings, String(period || '7d'));
      const shouldUseFallback =
        !statsPayload ||
        typeof statsPayload.revenue_gross === 'undefined' ||
        typeof statsPayload.periodLabel === 'undefined' ||
        typeof statsPayload.pending_payment_amount === 'undefined' ||
        typeof statsPayload.activeBookings === 'undefined' ||
        (
          parseMoney(statsPayload.revenue_gross ?? statsPayload.revenue) === 0 &&
          fallbackStats.revenue_gross > 0
        );

      setStats((prev) => ({
        ...prev,
        ...(shouldUseFallback ? fallbackStats : statsPayload),
        activeLockers: Number(statsPayload?.activeLockers ?? prev.activeLockers ?? 0),
        pendingKyc: Number(statsPayload?.pendingKyc ?? prev.pendingKyc ?? 0),
        period: shouldUseFallback
          ? fallbackStats.period
          : (statsPayload?.period || String(period || '7d')),
        periodLabel: shouldUseFallback
          ? fallbackStats.periodLabel
          : (statsPayload?.periodLabel || getPeriodLabel(String(period || '7d'))),
      }));
      setLastUpdatedAt(Date.now());
    } catch (error) {
      console.error('Gagal mengambil data dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const formatRupiah = (angka) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(angka || 0);
  };

  return { isLoading, stats, recentBookings, formatRupiah, lastUpdatedAt, refetch: fetchDashboardData };
};
