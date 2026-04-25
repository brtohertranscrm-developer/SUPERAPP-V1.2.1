import React, { useState, useEffect } from 'react';
import { Check, Copy, Ticket, X, ChevronRight, Clock, Sparkles } from 'lucide-react';

const fmtDateTime = (value) => {
  if (!value) return '—';
  const raw = String(value);
  const iso = raw.includes('T') ? raw : `${raw.replace(' ', 'T')}Z`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export default function VoucherSuccessModal({ voucher, onClose, onGoToVouchers }) {
  const [copied, setCopied] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (voucher) {
      requestAnimationFrame(() => setVisible(true));
    }
  }, [voucher]);

  if (!voucher) return null;

  const code = String(voucher.voucher_code || '');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select text manually
    }
  };

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 200);
  };

  const handleGoToVouchers = () => {
    setVisible(false);
    setTimeout(onGoToVouchers, 200);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 transition-all duration-200 ${visible ? 'bg-black/40 backdrop-blur-sm' : 'bg-transparent pointer-events-none'}`}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div
        className={`w-full max-w-sm bg-white rounded-[2rem] shadow-2xl overflow-hidden transition-all duration-200 ${visible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-8 opacity-0 scale-95'}`}
      >
        {/* Header gradient */}
        <div className="relative bg-gradient-to-br from-rose-500 to-rose-600 px-6 pt-8 pb-10 text-center overflow-hidden">
          {/* decorative circles */}
          <div className="absolute -top-6 -right-6 w-28 h-28 bg-white/10 rounded-full" />
          <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-white/10 rounded-full" />

          <button
            onClick={handleClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
          >
            <X size={16} />
          </button>

          <div className="relative z-10">
            <div className="w-16 h-16 rounded-[1.25rem] bg-white/20 flex items-center justify-center mx-auto mb-3">
              <Sparkles size={28} className="text-white" />
            </div>
            <p className="text-white/80 text-xs font-bold uppercase tracking-widest mb-1">Penukaran Berhasil!</p>
            <h2 className="text-white text-xl font-black leading-tight">{voucher.title || 'Voucher Miles'}</h2>
            {voucher.discount_percent > 0 && (
              <p className="text-white/90 text-sm font-semibold mt-1">
                Diskon {voucher.discount_percent}%
                {voucher.max_discount > 0 && ` · Maks Rp ${Number(voucher.max_discount).toLocaleString('id-ID')}`}
              </p>
            )}
          </div>
        </div>

        {/* Code card — overlaps header */}
        <div className="px-6 -mt-5">
          <div className="bg-slate-900 rounded-2xl p-4 shadow-lg">
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <Ticket size={12} /> Kode Voucher
            </p>
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-lg font-black text-white tracking-wider leading-none">
                {code}
              </span>
              <button
                onClick={handleCopy}
                className={`shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black transition-all active:scale-95 ${
                  copied
                    ? 'bg-emerald-500 text-white'
                    : 'bg-white text-slate-900 hover:bg-rose-500 hover:text-white'
                }`}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Tersalin!' : 'Salin'}
              </button>
            </div>
          </div>
        </div>

        {/* Info + CTA */}
        <div className="px-6 pt-4 pb-6 space-y-4">
          {voucher.expires_at && (
            <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
              <Clock size={14} className="text-amber-500 shrink-0" />
              Berlaku hingga {fmtDateTime(voucher.expires_at)}
            </div>
          )}

          <p className="text-[11px] text-slate-400 text-center font-medium leading-relaxed">
            Gunakan kode ini di checkout via kolom <span className="font-black text-slate-600">"Kode Promo"</span>
          </p>

          <button
            onClick={handleGoToVouchers}
            className="w-full flex items-center justify-center gap-2 bg-rose-500 hover:bg-slate-900 text-white py-3.5 rounded-xl font-black text-sm transition-all active:scale-95"
          >
            Lihat Semua Voucher Saya <ChevronRight size={16} />
          </button>

          <button
            onClick={handleClose}
            className="w-full text-slate-400 hover:text-slate-700 text-sm font-semibold transition-colors py-1"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
