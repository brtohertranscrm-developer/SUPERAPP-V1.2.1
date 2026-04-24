import React from 'react';

export default function StatusBadge({ status }) {
  const s = String(status || '').toLowerCase();
  const cls =
    s === 'completed'
      ? 'bg-emerald-100 text-emerald-700'
      : s === 'cancelled'
        ? 'bg-rose-100 text-rose-700'
        : 'bg-amber-100 text-amber-700';
  const label =
    s === 'completed' ? 'SELESAI'
      : s === 'cancelled' ? 'BATAL'
        : 'TERJADWAL';

  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest ${cls}`}>
      {label}
    </span>
  );
}

