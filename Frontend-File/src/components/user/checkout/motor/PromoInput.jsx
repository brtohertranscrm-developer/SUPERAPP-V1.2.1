import React, { useState } from 'react';
import { Tag, CheckCircle2, XCircle, Loader2, X } from 'lucide-react';
import { fmtRp } from './checkoutMotorUtils';

export default function PromoInput({ onApply, appliedPromo, onRemove, discountAmount, isChecking }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const handleApply = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setError('');
    const result = await onApply(trimmed);
    if (!result.success) {
      setError(result.error || 'Kode promo tidak valid.');
    } else {
      setCode('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleApply();
  };

  if (appliedPromo) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center">
            <CheckCircle2 size={18} className="text-white" />
          </div>
          <div>
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-0.5">Promo Aktif</p>
            <p className="font-black text-emerald-900 font-mono">{appliedPromo.code}</p>
            {discountAmount > 0 && (
              <p className="text-xs text-emerald-600 font-medium">Hemat {fmtRp(discountAmount)}</p>
            )}
          </div>
        </div>
        <button
          onClick={onRemove}
          className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
          aria-label="Hapus promo"
          type="button"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(''); }}
          onKeyDown={handleKeyDown}
          placeholder="Masukkan kode promo..."
          className={`w-full flex-1 px-4 py-3 border rounded-xl text-sm font-bold uppercase focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all ${
            error ? 'border-rose-300 bg-rose-50/50' : 'border-slate-200 bg-white'
          }`}
          disabled={isChecking}
          maxLength={20}
        />
        <button
          onClick={handleApply}
          disabled={isChecking || !code.trim()}
          className="w-full sm:w-auto px-5 py-3 bg-slate-900 text-white rounded-xl text-xs font-black hover:bg-rose-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 shrink-0"
          type="button"
        >
          {isChecking ? <Loader2 size={14} className="animate-spin" /> : <Tag size={14} />}
          <span>{isChecking ? 'Cek...' : 'Pasang'}</span>
        </button>
      </div>
      {error && (
        <p className="text-rose-600 text-xs font-bold flex items-center gap-1.5 px-1">
          <XCircle size={12} /> {error}
        </p>
      )}
    </div>
  );
}

