import React, { useMemo, useState } from 'react';
import { Copy, Check, Ticket, XCircle, Clock, Tag } from 'lucide-react';

const fmtDateTime = (value) => {
  if (!value) return '—';
  const raw = String(value);
  const iso = raw.includes('T') ? raw : `${raw.replace(' ', 'T')}Z`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const statusMeta = (s) => {
  const v = String(s || '').toLowerCase();
  if (v === 'active') return { label: 'Aktif', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  if (v === 'used') return { label: 'Dipakai', cls: 'bg-slate-50 text-slate-600 border-slate-200' };
  if (v === 'expired') return { label: 'Kedaluwarsa', cls: 'bg-amber-50 text-amber-700 border-amber-200' };
  if (v === 'cancelled') return { label: 'Dibatalkan', cls: 'bg-rose-50 text-rose-700 border-rose-200' };
  return { label: String(s || '—'), cls: 'bg-slate-50 text-slate-600 border-slate-200' };
};

const withinCancelWindow = (createdAt) => {
  if (!createdAt) return false;
  const raw = String(createdAt);
  const iso = raw.includes('T') ? raw : `${raw.replace(' ', 'T')}Z`;
  const created = new Date(iso);
  if (Number.isNaN(created.getTime())) return false;
  return (Date.now() - created.getTime()) <= 5 * 60 * 1000;
};

export default function MyVouchers({ vouchers = [], isLoading, onCancel }) {
  const [copiedCode, setCopiedCode] = useState('');

  const hasAny = vouchers.length > 0;
  const activeFirst = useMemo(() => vouchers.slice(), [vouchers]);

  const handleCopy = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(''), 1200);
    } catch {
      alert('Gagal menyalin. Silakan salin manual.');
    }
  };

  return (
    <div className="mt-10">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">Voucher Saya</p>
          <p className="text-lg font-black text-slate-900">Voucher Miles</p>
        </div>
        <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
          <Tag size={14} /> Pakai di checkout via “Kode Promo”
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-6 text-slate-500 text-sm font-medium">
          Memuat voucher...
        </div>
      ) : !hasAny ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-6 text-slate-500 text-sm font-medium">
          Belum ada voucher. Tukar Miles di katalog untuk mendapatkan kode voucher.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeFirst.map((v) => {
            const meta = statusMeta(v.status);
            const code = String(v.voucher_code || '');
            const canCancel = String(v.status) === 'active' && withinCancelWindow(v.created_at);
            return (
              <div key={v.id} className="bg-white border border-slate-100 rounded-[1.75rem] p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-rose-50 text-brand-primary flex items-center justify-center shrink-0">
                      <Ticket size={20} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-slate-900 truncate">{v.title || 'Voucher'}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-xl border text-[10px] font-black uppercase tracking-widest ${meta.cls}`}>
                          {meta.label}
                        </span>
                        {v.expires_at && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600">
                            <Clock size={12} /> Exp: {fmtDateTime(v.expires_at)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <div className="font-mono text-sm font-black tracking-wider text-slate-900">
                    {code || '—'}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopy(code)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-black hover:bg-brand-primary transition-colors"
                      disabled={!code}
                      title="Copy kode"
                    >
                      {copiedCode === code ? <Check size={14} /> : <Copy size={14} />}
                      {copiedCode === code ? 'Tersalin' : 'Copy'}
                    </button>
                    {canCancel && (
                      <button
                        type="button"
                        onClick={() => onCancel(code)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 text-rose-600 text-xs font-black hover:bg-rose-100 transition-colors"
                        title="Batalkan (refund Miles)"
                      >
                        <XCircle size={14} /> Batalkan
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

