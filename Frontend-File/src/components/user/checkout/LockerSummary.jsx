import React from 'react';
import { Package, Lock, Clock, Truck, ArrowDown } from 'lucide-react';

const fmtRp = (n) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;

const LockerSummary = ({
  locker,
  durationHours,
  pricing,
  pickupAddon,
  dropAddon,
  startDate,
  startTime
}) => {
  if (!locker || !pricing) return null;

  const TypeIcon = locker.type === 'tertutup' ? Lock : Package;
  const typeLabel = locker.type === 'tertutup' ? 'Rak Tertutup' : 'Rak Terbuka';

  // Kalkulasi end time
  const startMs = new Date(`${startDate}T${startTime || '09:00'}:00`).getTime();
  const endMs = startMs + durationHours * 60 * 60 * 1000;
  const endDate = new Date(endMs);
  const endStr = endDate.toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  const hasAddon = pickupAddon || dropAddon;
  const total = (pricing.total || 0) + (pickupAddon?.price || 0) + (dropAddon?.price || 0);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">

      {/* Header loker */}
      <div className="bg-slate-50 border-b border-slate-100 p-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
          <TypeIcon size={20} className="text-blue-600" />
        </div>
        <div>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{locker.location}</p>
          <p className="text-sm font-black text-slate-800">{typeLabel}</p>
          {locker.dimensions && <p className="text-[11px] text-slate-400 font-mono">{locker.dimensions} cm</p>}
        </div>
      </div>

      <div className="p-4 space-y-3">

        {/* Waktu */}
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Clock size={15} className="text-slate-400 shrink-0" />
          <span className="font-medium">
            {startDate && new Date(`${startDate}T${startTime || '09:00'}:00`).toLocaleDateString('id-ID', {
              day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
            })}
          </span>
          <span className="text-slate-300">→</span>
          <span className="font-medium">{startDate ? endStr : '—'}</span>
        </div>

        {/* Durasi */}
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Durasi</p>
          <p className="text-sm font-black text-slate-700">{durationHours} jam</p>

          {/* Breakdown paket */}
          {pricing.packs24 > 0 && (
            <p className="text-[11px] text-slate-500 mt-1">{pricing.packs24}× paket 24 jam = {fmtRp(pricing.packs24 * locker.price_24h)}</p>
          )}
          {pricing.packs12 > 0 && (
            <p className="text-[11px] text-slate-500">{pricing.packs12}× paket 12 jam = {fmtRp(pricing.packs12 * locker.price_12h)}</p>
          )}
          {pricing.remainingHours > 0 && (
            <p className="text-[11px] text-slate-500">{pricing.remainingHours}× per jam = {fmtRp(pricing.remainingHours * locker.price_1h)}</p>
          )}
        </div>

        {/* Rincian harga */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Sewa loker ({durationHours} jam)</span>
            <span className="font-bold text-slate-800">{fmtRp(pricing.total)}</span>
          </div>

          {pickupAddon && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-600 flex items-center gap-1.5">
                <Truck size={13} className="text-purple-400" />
                {pickupAddon.name}
              </span>
              <span className="font-bold text-purple-700">{fmtRp(pickupAddon.price)}</span>
            </div>
          )}

          {dropAddon && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-600 flex items-center gap-1.5">
                <ArrowDown size={13} className="text-orange-400" />
                {dropAddon.name}
              </span>
              <span className="font-bold text-orange-700">{fmtRp(dropAddon.price)}</span>
            </div>
          )}

          <div className="border-t border-slate-100 pt-2 flex justify-between">
            <span className="text-sm font-black text-slate-700">Total</span>
            <span className="text-lg font-black text-blue-700">{fmtRp(total)}</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default LockerSummary;
