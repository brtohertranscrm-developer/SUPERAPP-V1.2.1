import React from 'react';
import { Pencil, Trash2, ToggleLeft, ToggleRight, Percent, Hash } from 'lucide-react';

const fmtRp = (n) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;

const badge = (active) =>
  active
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : 'bg-slate-50 text-slate-600 border-slate-200';

const typeLabel = (t) => (String(t || '').toLowerCase() === 'fixed' ? 'Fixed' : 'Percent');

const typesLabel = (csv) => {
  const types = String(csv || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (types.length === 0) return 'Semua';
  return types.map((t) => (t === 'car' ? 'Mobil' : t === 'motor' ? 'Motor' : t === 'locker' ? 'Loker' : t)).join(', ');
};

export default function MilesRewardsList({ rewards = [], isLoading, onEdit, onDelete, onToggle }) {
  if (isLoading) {
    return (
      <div className="bg-white border border-slate-100 rounded-2xl p-6 text-slate-500 text-sm font-medium">
        Memuat rewards...
      </div>
    );
  }

  if (!rewards.length) {
    return (
      <div className="bg-white border border-slate-100 rounded-2xl p-6 text-slate-500 text-sm font-medium">
        Belum ada Miles reward. Klik “Tambah Reward” untuk membuat pertama.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {rewards.map((r) => {
        const active = Number(r.is_active) === 1;
        const type = String(r.reward_type || 'percent').toLowerCase();
        const summary =
          type === 'fixed'
            ? `${fmtRp(r.discount_amount)}`
            : `${Number(r.discount_percent) || 0}% · Max ${fmtRp(r.max_discount)}`;
        return (
          <div key={r.id} className="bg-white border border-slate-100 rounded-[1.75rem] p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-xl border text-[10px] font-black uppercase tracking-widest ${badge(active)}`}>
                    {active ? 'Aktif' : 'Nonaktif'}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600">
                    {type === 'fixed' ? <Hash size={12} /> : <Percent size={12} />} {typeLabel(type)}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-xl bg-rose-50 border border-rose-100 text-[10px] font-black uppercase tracking-widest text-brand-primary">
                    {Number(r.miles_cost || 0).toLocaleString('id-ID')} Miles
                  </span>
                </div>
                <p className="mt-2 font-black text-slate-900 text-lg leading-snug">{r.title}</p>
                <p className="mt-1 text-sm text-slate-600 font-medium">
                  Rule: <span className="font-black text-slate-900">{summary}</span>
                </p>
                <p className="mt-1 text-xs text-slate-500 font-medium">
                  Berlaku: {typesLabel(r.allowed_item_types)} · Exp: {Number(r.valid_days || 30)} hari
                </p>
                {r.desc && (
                  <p className="mt-2 text-xs text-slate-500 font-medium leading-relaxed">
                    {String(r.desc).slice(0, 160)}
                  </p>
                )}
              </div>

              <div className="shrink-0 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => onToggle(r.id, !active)}
                  className={`inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-black border transition-colors ${
                    active
                      ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      : 'bg-slate-900 text-white border-slate-900 hover:bg-brand-primary hover:border-brand-primary'
                  }`}
                  title={active ? 'Nonaktifkan' : 'Aktifkan'}
                >
                  {active ? <ToggleLeft size={16} /> : <ToggleRight size={16} />}
                  {active ? 'Matikan' : 'Aktifkan'}
                </button>
                <button
                  type="button"
                  onClick={() => onEdit(r)}
                  className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-black bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
                >
                  <Pencil size={16} /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(r.id)}
                  className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-black bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors"
                >
                  <Trash2 size={16} /> Hapus
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

