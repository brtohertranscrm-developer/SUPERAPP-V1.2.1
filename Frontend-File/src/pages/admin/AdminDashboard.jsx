import React from 'react';
import { Loader2 } from 'lucide-react';
import { useDashboard } from '../../hooks/useDashboard';
import StatsPanel from '../../components/admin/dashboard/StatsPanel';
import QuickMenu from '../../components/admin/dashboard/QuickMenu';
import RecentBookings from '../../components/admin/dashboard/RecentBookings';

export default function AdminDashboard() {
  const { isLoading, stats, recentBookings, formatRupiah } = useDashboard();

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
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none mb-2">Ringkasan Operasional</h1>
        <p className="text-slate-500 text-sm font-medium">Status bisnis Brother Trans secara real-time.</p>
      </div>

      <StatsPanel stats={stats} formatRupiah={formatRupiah} />
      <QuickMenu />
      <RecentBookings bookings={recentBookings} />
    </div>
  );
}