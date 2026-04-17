import React from 'react';
import { Award, ChevronRight, Gift } from 'lucide-react';

const UserStats = ({ currentMiles, navigate }) => {
  const targetMiles = currentMiles < 500 ? 500 : 1000;
  const nextTier = currentMiles < 500 ? "Gold" : "Platinum";
  const progressPercent = Math.min((currentMiles / targetMiles) * 100, 100);
  const remainingMiles = Math.max(0, targetMiles - currentMiles);

  return (
    <div className="bg-gradient-to-br from-[#BF953F] via-[#FCF6BA] to-[#B38728] rounded-[2.5rem] p-6 sm:p-8 text-amber-950 relative overflow-hidden shadow-xl border border-[#AA771C]/30 transition-transform hover:scale-[1.01]">
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/40 rounded-full blur-[80px] opacity-70 -mr-20 -mt-20 pointer-events-none"></div>
      <div className="relative z-10">
        <div className="flex justify-between items-center mb-6">
          <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-amber-900 flex items-center gap-1.5 bg-white/30 px-3 py-1.5 rounded-full border border-white/40"><Award size={16} className="text-amber-900"/> Brother Miles</span>
          <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest bg-amber-950 text-[#FCF6BA] px-4 py-2 rounded-xl shadow-lg border border-amber-900">{currentMiles >= 500 ? 'Gold Tier' : 'Classic Tier'}</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="text-[11px] font-black uppercase tracking-widest text-amber-900/80 mb-1">Saldo Anda</div>
            <div className="text-5xl sm:text-6xl font-black tracking-tight drop-shadow">{currentMiles.toLocaleString('id-ID')}</div>
          </div>
          <div className="flex-1 sm:max-w-xs bg-amber-950/10 p-4 rounded-2xl border border-amber-900/20 backdrop-blur-sm">
            <div className="w-full bg-amber-950/20 h-2.5 rounded-full overflow-hidden border border-amber-900/30">
              <div className="bg-amber-950 h-full rounded-full shadow-inner transition-all duration-1000 ease-out" style={{ width: `${progressPercent}%` }}></div>
            </div>
            <p className="text-[11px] text-amber-950 mt-2 font-bold flex justify-between"><span>{remainingMiles > 0 ? `${remainingMiles} Miles lagi ke ${nextTier}` : `Mencapai Top Tier!`}</span><ChevronRight size={14} /></p>
          </div>
        </div>
        <button onClick={() => navigate('/rewards')} className="w-full py-4 bg-amber-950 text-[#FCF6BA] font-black rounded-2xl text-sm hover:bg-black transition-colors flex justify-center items-center gap-2.5 shadow-xl hover:-translate-y-1 active:scale-95"><Gift size={18}/> Tukar Rewards Eksklusif</button>
      </div>
    </div>
  );
};

export default UserStats;