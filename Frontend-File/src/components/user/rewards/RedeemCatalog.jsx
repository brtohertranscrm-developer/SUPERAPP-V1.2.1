import React from 'react';
import { Ticket, Percent, ChevronRight } from 'lucide-react';

const typePill = (csv) => {
  const types = String(csv || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (types.length === 0) return 'Semua';
  const labels = types.map((t) => (t === 'car' ? 'Mobil' : t === 'motor' ? 'Motor' : t === 'locker' ? 'Loker' : t));
  return labels.join(', ');
};

const RedeemCatalog = ({ rewards = [], currentMiles, isRedeeming, onRedeem }) => {

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {rewards.map((reward) => {
        const cost = Number(reward?.miles_cost) || 0;
        const pct = Number(reward?.discount_percent) || 0;
        const max = Number(reward?.max_discount) || 0;
        const isAffordable = currentMiles >= cost;
        
        return (
          <div key={reward.id} className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 rounded-2xl bg-rose-50 text-brand-primary">
                  <Ticket size={24} />
                </div>
                <div className={`text-xs font-bold px-3 py-1 rounded-lg ${isAffordable ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-400'}`}>
                  {cost.toLocaleString('id-ID')} Miles
                </div>
              </div>
              <h3 className="font-black text-slate-900 mb-1">{reward.title}</h3>
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600">
                  <Percent size={12} /> {pct}% {max > 0 ? `· Max Rp ${max.toLocaleString('id-ID')}` : ''}
                </div>
                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600">
                  Berlaku: {typePill(reward.allowed_item_types)}
                </div>
              </div>
            </div>

            <button 
              onClick={() => onRedeem(reward)}
              disabled={!isAffordable || isRedeeming}
              className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all ${isAffordable ? 'bg-rose-500 text-white hover:bg-slate-900 shadow-lg active:scale-95' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
            >
              {isRedeeming ? 'Memproses...' : isAffordable ? (
                <span className="inline-flex items-center justify-center gap-2">
                  Tukar Sekarang <ChevronRight size={16} />
                </span>
              ) : 'Miles Tidak Cukup'}
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default RedeemCatalog;
