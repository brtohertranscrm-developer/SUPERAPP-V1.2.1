import React, { useEffect, useState } from 'react';
import { Ticket, X, Sparkles, Percent } from 'lucide-react';

const typePill = (csv) => {
  const types = String(csv || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (types.length === 0) return 'Semua Layanan';
  return types.map((t) => (t === 'car' ? 'Mobil' : t === 'motor' ? 'Motor' : t === 'locker' ? 'Loker' : t)).join(', ');
};

export default function ConfirmRedeemModal({ reward, currentMiles, isRedeeming, onConfirm, onClose }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (reward) requestAnimationFrame(() => setVisible(true));
  }, [reward]);

  if (!reward) return null;

  const cost = Number(reward.miles_cost) || 0;
  const remaining = currentMiles - cost;

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 200);
  };

  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 transition-all duration-200 ${visible ? 'bg-black/40 backdrop-blur-sm' : 'bg-transparent pointer-events-none'}`}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div
        className={`w-full max-w-sm bg-white rounded-[2rem] shadow-2xl overflow-hidden transition-all duration-200 ${visible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-8 opacity-0 scale-95'}`}
      >
        <div className="px-6 pt-6 pb-2 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500">
              <Ticket size={22} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tukar Miles</p>
              <p className="font-black text-slate-900 text-base leading-tight">{reward.title}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-4 space-y-3">
          {/* Reward info */}
          <div className="bg-slate-50 rounded-2xl p-4 space-y-2">
            {Number(reward.discount_percent) > 0 && (
              <div className="flex items-center gap-2 text-sm text-slate-700 font-semibold">
                <Percent size={14} className="text-rose-500" />
                Diskon {reward.discount_percent}%
                {Number(reward.max_discount) > 0 && (
                  <span className="text-slate-400 font-medium">· Maks Rp {Number(reward.max_discount).toLocaleString('id-ID')}</span>
                )}
              </div>
            )}
            <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
              <Sparkles size={13} className="text-amber-500" />
              Berlaku: {typePill(reward.allowed_item_types)}
            </div>
            {reward.validity_days > 0 && (
              <div className="text-xs text-slate-400 font-medium">
                Masa aktif {reward.validity_days} hari setelah ditukar
              </div>
            )}
          </div>

          {/* Miles deduction */}
          <div className="bg-rose-50 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-rose-400 mb-0.5">Miles digunakan</p>
              <p className="text-rose-600 font-black text-xl">{cost.toLocaleString('id-ID')} <span className="text-sm">Miles</span></p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Sisa setelah</p>
              <p className="text-slate-700 font-black text-xl">{remaining.toLocaleString('id-ID')} <span className="text-sm">Miles</span></p>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={handleClose}
            disabled={isRedeeming}
            className="flex-1 py-3.5 rounded-xl border-2 border-slate-200 text-slate-600 font-black text-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={handleConfirm}
            disabled={isRedeeming}
            className="flex-1 py-3.5 rounded-xl bg-rose-500 hover:bg-slate-900 text-white font-black text-sm transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isRedeeming ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Memproses...
              </span>
            ) : 'Ya, Tukar!'}
          </button>
        </div>
      </div>
    </div>
  );
}
