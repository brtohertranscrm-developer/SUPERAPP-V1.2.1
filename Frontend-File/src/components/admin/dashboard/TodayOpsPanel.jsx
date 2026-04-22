import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarCheck2, RotateCcw, AlertTriangle, ArrowRight } from 'lucide-react';

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

const startOfLocalDay = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfLocalDay = () => {
  const d = startOfLocalDay();
  d.setDate(d.getDate() + 1);
  return d;
};

const isBetween = (dt, start, end) => {
  if (!dt || Number.isNaN(dt.getTime())) return false;
  return dt.getTime() >= start.getTime() && dt.getTime() < end.getTime();
};

export default function TodayOpsPanel({ bookings = [], onRefresh }) {
  const navigate = useNavigate();

  const computed = useMemo(() => {
    const list = Array.isArray(bookings) ? bookings : [];
    const s = startOfLocalDay();
    const e = endOfLocalDay();
    const now = new Date();

    const pickupsToday = [];
    const returnsToday = [];
    const newBookingsToday = [];
    const overdue = [];
    const preparing = [];

    for (const b of list) {
      const start = normalizeDt(b.start_date);
      const end = normalizeDt(b.end_date);
      const created = normalizeDt(b.created_at);

      if (isBetween(start, s, e) && b.status !== 'cancelled') pickupsToday.push(b);
      if (isBetween(end, s, e) && b.status !== 'cancelled') returnsToday.push(b);
      if (isBetween(created, s, e) && b.status !== 'cancelled') newBookingsToday.push(b);

      if (String(b.status) === 'active' && end && end.getTime() < now.getTime()) overdue.push(b);
      if (String(b.status) === 'pending' && b.status !== 'cancelled' && (String(b.payment_status) === 'paid' || Number(b.paid_amount) > 0)) {
        preparing.push(b);
      }
    }

    pickupsToday.sort((a, b) => (normalizeDt(a.start_date)?.getTime() || 0) - (normalizeDt(b.start_date)?.getTime() || 0));
    returnsToday.sort((a, b) => (normalizeDt(a.end_date)?.getTime() || 0) - (normalizeDt(b.end_date)?.getTime() || 0));
    newBookingsToday.sort((a, b) => (normalizeDt(b.created_at)?.getTime() || 0) - (normalizeDt(a.created_at)?.getTime() || 0));
    overdue.sort((a, b) => (normalizeDt(a.end_date)?.getTime() || 0) - (normalizeDt(b.end_date)?.getTime() || 0));
    preparing.sort((a, b) => (normalizeDt(b.created_at)?.getTime() || 0) - (normalizeDt(a.created_at)?.getTime() || 0));

    const counts = {
      pickups_today: pickupsToday.length,
      returns_today: returnsToday.length,
      new_bookings_today: newBookingsToday.length,
      preparing: preparing.length,
      overdue: overdue.length,
    };

    return {
      counts,
      pickupsToday,
      returnsToday,
      newBookingsToday,
      overdue,
      preparing,
    };
  }, [bookings]);

  const counts = computed.counts || {};

  const topRows = useMemo(() => {
    const overdue = Array.isArray(computed?.overdue) ? computed.overdue.slice(0, 3) : [];
    const pickups = Array.isArray(computed?.pickupsToday) ? computed.pickupsToday.slice(0, 3) : [];
    const returns = Array.isArray(computed?.returnsToday) ? computed.returnsToday.slice(0, 3) : [];

    return { overdue, pickups, returns };
  }, [computed]);

  return (
    <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden mb-10">
      <div className="p-6 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/30">
        <div className="flex items-center gap-2">
          <CalendarCheck2 className="text-indigo-600" />
          <h2 className="text-lg font-black text-slate-900">Hari Ini</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onRefresh?.()}
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
                {c.value}
              </div>
            </div>
          ))}
        </div>

        {(counts.overdue || 0) > 0 && (
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
