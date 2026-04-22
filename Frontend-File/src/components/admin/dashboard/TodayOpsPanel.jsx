import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarCheck2, RotateCcw, AlertTriangle, ArrowRight } from 'lucide-react';
import { useTodayOps } from '../../../hooks/useTodayOps';

const fmtTime = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
};

const normalizeDt = (value) => {
  if (!value) return null;
  const dt = new Date(value);
  if (!Number.isNaN(dt.getTime())) return dt;
  if (typeof value === 'string') {
    const retry = new Date(value.replace(' ', 'T'));
    if (!Number.isNaN(retry.getTime())) return retry;
  }
  return null;
};

const BookingRow = ({ b, label, danger = false }) => {
  const start = normalizeDt(b.start_date);
  const end = normalizeDt(b.end_date);

  return (
    <div className={`flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border ${
      danger ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-100'
    }`}>
      <div className="min-w-0">
        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</div>
        <div className="font-black text-slate-900 truncate">{b.item_name}</div>
        <div className="text-xs text-slate-500 font-semibold truncate">
          {b.order_id} · {fmtTime(start?.toISOString?.() || b.start_date)} → {fmtTime(end?.toISOString?.() || b.end_date)}
        </div>
      </div>
      <div className="shrink-0 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-xl bg-slate-900 text-white">
        {String(b.status || 'pending')}
      </div>
    </div>
  );
};

export default function TodayOpsPanel() {
  const navigate = useNavigate();
  const { isLoading, data, refetch } = useTodayOps();

  const counts = data?.counts || {};

  const topRows = useMemo(() => {
    const overdue = Array.isArray(data?.overdue) ? data.overdue.slice(0, 3) : [];
    const pickups = Array.isArray(data?.pickupsToday) ? data.pickupsToday.slice(0, 3) : [];
    const returns = Array.isArray(data?.returnsToday) ? data.returnsToday.slice(0, 3) : [];

    return { overdue, pickups, returns };
  }, [data]);

  return (
    <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden mb-10">
      <div className="p-6 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/30">
        <div className="flex items-center gap-2">
          <CalendarCheck2 className="text-indigo-600" />
          <h2 className="text-lg font-black text-slate-900">Hari Ini</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="px-3 py-2 rounded-2xl bg-white border border-slate-200 text-slate-700 font-black text-xs hover:border-rose-300 hover:text-rose-600 transition-colors flex items-center gap-2"
          >
            <RotateCcw size={14} /> Refresh
          </button>
          <button
            onClick={() => navigate('/admin/booking')}
            className="px-3 py-2 rounded-2xl bg-slate-900 text-white font-black text-xs hover:bg-rose-500 transition-colors flex items-center gap-2"
          >
            Kelola Booking <ArrowRight size={14} />
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { k: 'pickups_today', label: 'Pickup', value: counts.pickups_today || 0 },
            { k: 'returns_today', label: 'Return', value: counts.returns_today || 0 },
            { k: 'new_bookings_today', label: 'Booking Baru', value: counts.new_bookings_today || 0 },
            { k: 'preparing', label: 'Siap-siap', value: counts.preparing || 0 },
            { k: 'overdue', label: 'Terlambat', value: counts.overdue || 0, danger: true },
          ].map((c) => (
            <div key={c.k} className={`rounded-3xl border p-4 ${c.danger ? 'bg-amber-50 border-amber-200' : 'bg-slate-50/60 border-slate-100'}`}>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{c.label}</div>
              <div className={`text-2xl font-black mt-1 ${c.danger ? 'text-amber-700' : 'text-slate-900'}`}>
                {isLoading ? '…' : c.value}
              </div>
            </div>
          ))}
        </div>

        {!isLoading && (counts.overdue || 0) > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 flex items-start gap-3">
            <AlertTriangle className="text-amber-600 mt-0.5" size={18} />
            <div>
              <div className="font-black text-amber-800">Ada booking terlambat</div>
              <div className="text-sm text-amber-700 font-semibold">Cek list di bawah dan follow up pelanggan.</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Terlambat</div>
            {(topRows.overdue.length ? topRows.overdue : []).map((b) => (
              <BookingRow key={b.order_id} b={b} label="Overdue" danger />
            ))}
            {!topRows.overdue.length && (
              <div className="text-sm text-slate-400 font-semibold px-1">Tidak ada.</div>
            )}
          </div>

          <div className="space-y-2">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pickup Hari Ini</div>
            {(topRows.pickups.length ? topRows.pickups : []).map((b) => (
              <BookingRow key={b.order_id} b={b} label="Pickup" />
            ))}
            {!topRows.pickups.length && (
              <div className="text-sm text-slate-400 font-semibold px-1">Tidak ada.</div>
            )}
          </div>

          <div className="space-y-2">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Return Hari Ini</div>
            {(topRows.returns.length ? topRows.returns : []).map((b) => (
              <BookingRow key={b.order_id} b={b} label="Return" />
            ))}
            {!topRows.returns.length && (
              <div className="text-sm text-slate-400 font-semibold px-1">Tidak ada.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

