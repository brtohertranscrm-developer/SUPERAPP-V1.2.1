import React, { useMemo, useState } from 'react';
import { Copy, Check, Ticket, XCircle, Clock, Tag, AlertCircle } from 'lucide-react';

const fmtDateTime = (value) => {
  if (!value) return '—';
  const raw = String(value);
  const iso = raw.includes('T') ? raw : `${raw.replace(' ', 'T')}Z`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

const statusMeta = (s) => {
  const v = String(s || '').toLowerCase();
  if (v === 'active') return { label: 'Aktif', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  if (v === 'used') return { label: 'Dipakai', cls: 'bg-slate-50 text-slate-500 border-slate-200' };
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

export default function MyVouchers({ vouchers = [], isLoading, onCancel, highlightCode = '' }) {
  const [copiedCode, setCopiedCode] = useState('');
  const [cancelTarget, setCancelTarget] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelResult, setCancelResult] = useState(null); // { ok, msg }

  // Aktif muncul duluan, lalu yang lain
  const sorted = useMemo(() => {
    const active = vouchers.filter((v) => v.status === 'active');
    const rest = vouchers.filter((v) => v.status !== 'active');
    return [...active, ...rest];
  }, [vouchers]);

  const activeCount = useMemo(() => vouchers.filter((v) => v.status === 'active').length, [vouchers]);

  const handleCopy = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(''), 1500);
    } catch {
      // browser tak support
    }
  };

  const handleCancelConfirm = async () => {
    if (!cancelTarget) return;
    setCancelLoading(true);
    setCancelResult(null);
    const result = await onCancel(cancelTarget);
    setCancelLoading(false);
    if (result?.success) {
      setCancelResult({ ok: true, msg: result.message || 'Voucher dibatalkan, Miles dikembalikan.' });
      setTimeout(() => { setCancelTarget(''); setCancelResult(null); }, 2000);
    } else {
      setCancelResult({ ok: false, msg: result?.message || 'Gagal membatalkan.' });
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">Dompet Voucher</p>
          <div className="flex items-center gap-2">
            <p className="text-lg font-black text-slate-900">Voucher Miles Saya</p>
            {activeCount > 0 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-rose-500 text-white text-xs font-black">
                {activeCount} aktif
              </span>
            )}
          </div>
        </div>
        <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
          <Tag size={13} /> Pakai di checkout via "Kode Promo"
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center text-slate-400 text-sm font-medium">
          <div className="w-6 h-6 border-2 border-slate-200 border-t-rose-400 rounded-full animate-spin mx-auto mb-2" />
          Memuat voucher...
        </div>
      ) : sorted.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-3">
            <Ticket size={24} className="text-slate-300" />
          </div>
          <p className="text-slate-500 text-sm font-semibold">Belum ada voucher</p>
          <p className="text-slate-400 text-xs mt-1">Tukar Miles di katalog untuk mendapatkan kode voucher.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sorted.map((v) => {
            const meta = statusMeta(v.status);
            const code = String(v.voucher_code || '');
            const canCancel = String(v.status) === 'active' && withinCancelWindow(v.created_at);
            const isNew = highlightCode && code === highlightCode;
            const isUsed = v.status === 'used' || v.status === 'expired' || v.status === 'cancelled';

            return (
              <div
                key={v.id}
                className={`rounded-[1.75rem] p-5 border transition-all duration-500 ${
                  isNew
                    ? 'bg-rose-50 border-rose-200 shadow-md shadow-rose-100 ring-2 ring-rose-300/50'
                    : isUsed
                    ? 'bg-slate-50 border-slate-100 opacity-60'
                    : 'bg-white border-slate-100 shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${isNew ? 'bg-rose-100 text-rose-500' : 'bg-rose-50 text-rose-400'}`}>
                      <Ticket size={20} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-black text-slate-900 truncate">{v.title || 'Voucher'}</p>
                        {isNew && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-rose-500 text-white text-[9px] font-black uppercase tracking-widest">
                            Baru
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-xl border text-[10px] font-black uppercase tracking-widest ${meta.cls}`}>
                          {meta.label}
                        </span>
                        {v.expires_at && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500">
                            <Clock size={11} /> Exp: {fmtDateTime(v.expires_at)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Kode area */}
                <div className={`mt-4 rounded-xl px-3 py-2.5 flex items-center justify-between gap-3 ${isNew ? 'bg-white border border-rose-200' : 'bg-slate-50 border border-slate-100'}`}>
                  <span className={`font-mono text-sm font-black tracking-wider ${isUsed ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                    {code || '—'}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    {!isUsed && (
                      <button
                        type="button"
                        onClick={() => handleCopy(code)}
                        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all active:scale-95 ${
                          copiedCode === code
                            ? 'bg-emerald-500 text-white'
                            : 'bg-slate-900 text-white hover:bg-rose-500'
                        }`}
                        disabled={!code}
                      >
                        {copiedCode === code ? <Check size={13} /> : <Copy size={13} />}
                        {copiedCode === code ? 'Tersalin' : 'Salin'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Cancel flow inline */}
                {canCancel && cancelTarget !== code && (
                  <button
                    type="button"
                    onClick={() => setCancelTarget(code)}
                    className="mt-3 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 text-rose-500 text-xs font-black hover:bg-rose-100 transition-colors border border-rose-100"
                  >
                    <XCircle size={13} /> Batalkan & Refund Miles
                  </button>
                )}

                {/* Inline cancel confirmation */}
                {cancelTarget === code && (
                  <div className="mt-3 bg-rose-50 border border-rose-200 rounded-xl p-3 space-y-2">
                    {cancelResult ? (
                      <div className={`flex items-center gap-2 text-xs font-bold ${cancelResult.ok ? 'text-emerald-600' : 'text-rose-600'}`}>
                        <AlertCircle size={14} /> {cancelResult.msg}
                      </div>
                    ) : (
                      <>
                        <p className="text-xs text-rose-700 font-semibold">
                          Batalkan voucher ini dan refund Miles? (hanya bisa dalam 5 menit)
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setCancelTarget('')}
                            disabled={cancelLoading}
                            className="flex-1 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-xs font-black hover:bg-slate-50 transition-colors disabled:opacity-50"
                          >
                            Tidak
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelConfirm}
                            disabled={cancelLoading}
                            className="flex-1 py-2 rounded-xl bg-rose-500 text-white text-xs font-black hover:bg-rose-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5"
                          >
                            {cancelLoading ? (
                              <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                            ) : (
                              'Ya, Batalkan'
                            )}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
