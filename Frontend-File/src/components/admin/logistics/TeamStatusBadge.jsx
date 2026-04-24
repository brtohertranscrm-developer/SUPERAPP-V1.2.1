import React from 'react';

export default function TeamStatusBadge({ status }) {
  const s = String(status || 'on').toLowerCase();
  const cls =
    s === 'on'
      ? 'bg-emerald-100 text-emerald-700'
      : s === 'off'
        ? 'bg-slate-100 text-slate-700'
        : s === 'leave'
          ? 'bg-amber-100 text-amber-700'
          : 'bg-rose-100 text-rose-700';
  const label =
    s === 'on' ? 'ON'
      : s === 'off' ? 'LIBUR'
        : s === 'leave' ? 'CUTI'
          : 'SAKIT';

  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-widest ${cls}`}>
      {label}
    </span>
  );
}

