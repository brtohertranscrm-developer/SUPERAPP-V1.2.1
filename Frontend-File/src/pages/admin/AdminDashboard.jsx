import React, { useMemo, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { useDashboard } from '../../hooks/useDashboard';
import StatsPanel from '../../components/admin/dashboard/StatsPanel';
import QuickMenu from '../../components/admin/dashboard/QuickMenu';
import RecentBookings from '../../components/admin/dashboard/RecentBookings';

export default function AdminDashboard() {
  const [period, setPeriod] = useState('7d');
  const { isLoading, stats, recentBookings, formatRupiah, lastUpdatedAt, refetch } = useDashboard({ period });

  const periodOptions = useMemo(() => ([
    { value: 'today', label: 'Hari Ini' },
    { value: '7d', label: '7 Hari Terakhir' },
    { value: '30d', label: '30 Hari Terakhir' },
    { value: 'mtd', label: 'Bulan Ini (MTD)' },
    { value: 'ytd', label: 'Tahun Ini (YTD)' },
    { value: 'all', label: 'Semua Waktu' },
  ]), []);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-rose-500">
        <Loader2 className="animate-spin mb-4" size={48} />
        <p className="font-bold text-slate-500 uppercase tracking-widest text-[10px]">Sinkronisasi Data...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up pb-10">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none mb-2">Ringkasan Operasional</h1>
          <p className="text-slate-500 text-sm font-medium">
            Status bisnis Brother Trans. Periode laporan bisa diubah di kanan.
          </p>
          {lastUpdatedAt && (
            <p className="text-[11px] text-slate-400 font-semibold mt-2">
              Terakhir diperbarui: {new Date(lastUpdatedAt).toLocaleString('id-ID')}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-2 sm:items-center">
          <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm flex items-center gap-3">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Periode</div>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="text-sm font-black text-slate-900 bg-transparent outline-none"
            >
              {periodOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => refetch()}
            className="bg-slate-900 text-white rounded-2xl px-4 py-3 font-black text-sm shadow-sm hover:bg-rose-500 transition-colors flex items-center justify-center gap-2"
            title="Refresh"
          >
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      <StatsPanel stats={stats} formatRupiah={formatRupiah} />
      <QuickMenu />
      <RecentBookings bookings={recentBookings} />
    </div>
  );
}
