import React from 'react';
import { TrendingUp, Bike, Package, AlertCircle } from 'lucide-react';

const StatsPanel = ({ stats, formatRupiah }) => {
  return (
    <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 mb-10 flex flex-col lg:flex-row overflow-hidden">
      <div className="bg-slate-900 p-8 sm:p-10 lg:w-2/5 flex flex-col justify-center relative overflow-hidden group shrink-0">
        <div className="absolute -right-6 -bottom-6 opacity-10 group-hover:scale-110 group-hover:-rotate-12 transition-all duration-700">
          <TrendingUp size={160} strokeWidth={1} className="text-white" />
        </div>
        <div className="relative z-10">
          <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-2 italic">
            <TrendingUp size={14} className="text-emerald-400" /> Estimasi Pendapatan
          </div>
          <div className="text-4xl sm:text-5xl font-black text-white tracking-tighter drop-shadow-lg">
            {formatRupiah(stats.revenue)}
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 sm:p-8 flex flex-col sm:flex-row justify-between gap-6 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
        <div className="flex-1 flex items-center gap-4 sm:px-6 group">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 bg-rose-50 text-rose-500 group-hover:bg-rose-500 group-hover:text-white transition-all">
            <Bike size={24} />
          </div>
          <div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Motor Disewa</div>
            <div className="text-2xl font-black text-slate-900 leading-none">{stats.activeMotors}</div>
          </div>
        </div>

        <div className="flex-1 flex items-center gap-4 pt-6 sm:pt-0 sm:px-6 group">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 bg-blue-50 text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-all">
            <Package size={24} />
          </div>
          <div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Loker Aktif</div>
            <div className="text-2xl font-black text-slate-900 leading-none">{stats.activeLockers}</div>
          </div>
        </div>

        <div className="flex-1 flex items-center gap-4 pt-6 sm:pt-0 sm:pl-6 group">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-all ${stats.pendingKyc > 0 ? 'bg-amber-50 text-amber-600 group-hover:bg-amber-500 group-hover:text-white animate-pulse' : 'bg-slate-50 text-slate-300'}`}>
            <AlertCircle size={24} />
          </div>
          <div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pending KYC</div>
            <div className={`text-2xl font-black leading-none ${stats.pendingKyc > 0 ? 'text-amber-600' : 'text-slate-900'}`}>{stats.pendingKyc}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsPanel;