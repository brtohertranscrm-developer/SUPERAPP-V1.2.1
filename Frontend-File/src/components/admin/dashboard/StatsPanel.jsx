import React from 'react';
import { TrendingUp, Bike, Package, AlertCircle, ClipboardList, Wallet, BadgeCheck } from 'lucide-react';

const StatsPanel = ({ stats, formatRupiah }) => {
  const grossRevenue = stats?.revenue_gross ?? stats?.revenue ?? 0;
  const paidRevenue = stats?.revenue_paid ?? 0;
  const pendingAmount = stats?.pending_payment_amount ?? 0;
  const pendingCount = stats?.pending_payment_count ?? 0;

  return (
    <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 mb-10 flex flex-col lg:flex-row overflow-hidden">
      <div className="bg-slate-900 p-8 sm:p-10 lg:w-2/5 flex flex-col justify-center relative overflow-hidden group shrink-0">
        <div className="absolute -right-6 -bottom-6 opacity-10 group-hover:scale-110 group-hover:-rotate-12 transition-all duration-700">
          <TrendingUp size={160} strokeWidth={1} className="text-white" />
        </div>
        <div className="relative z-10">
          <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-2 italic">
            <TrendingUp size={14} className="text-emerald-400" /> Nilai Transaksi (Gross)
          </div>
          <div className="text-4xl sm:text-5xl font-black text-white tracking-tighter drop-shadow-lg">
            {formatRupiah(grossRevenue)}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-bold">
            <span className="px-3 py-1 rounded-full bg-white/10 text-slate-200">
              {stats?.periodLabel || 'Periode Terpilih'}
            </span>
            <span className="px-3 py-1 rounded-full bg-emerald-400/20 text-emerald-200 flex items-center gap-1.5">
              <BadgeCheck size={14} /> Paid: {formatRupiah(paidRevenue)}
            </span>
            <span className={`px-3 py-1 rounded-full ${pendingCount > 0 ? 'bg-amber-400/20 text-amber-200' : 'bg-white/10 text-slate-200'}`}>
              Outstanding: {formatRupiah(pendingAmount)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 sm:p-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div className="bg-slate-50/60 border border-slate-100 rounded-3xl p-5 flex items-center gap-4 group hover:bg-white transition-colors">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
              <ClipboardList size={24} />
            </div>
            <div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Booking Aktif</div>
              <div className="text-2xl font-black text-slate-900 leading-none">{stats?.activeBookings ?? 0}</div>
            </div>
          </div>

          <div className="bg-slate-50/60 border border-slate-100 rounded-3xl p-5 flex items-center gap-4 group hover:bg-white transition-colors">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 bg-rose-50 text-rose-500 group-hover:bg-rose-500 group-hover:text-white transition-all">
              <Bike size={24} />
            </div>
            <div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Motor Disewa</div>
              <div className="text-2xl font-black text-slate-900 leading-none">{stats?.activeMotors ?? 0}</div>
            </div>
          </div>

          <div className="bg-slate-50/60 border border-slate-100 rounded-3xl p-5 flex items-center gap-4 group hover:bg-white transition-colors">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 bg-blue-50 text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-all">
              <Package size={24} />
            </div>
            <div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Loker Aktif</div>
              <div className="text-2xl font-black text-slate-900 leading-none">{stats?.activeLockers ?? 0}</div>
            </div>
          </div>

          <div className="bg-slate-50/60 border border-slate-100 rounded-3xl p-5 flex items-center gap-4 group hover:bg-white transition-colors">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-all ${
              pendingCount > 0 ? 'bg-amber-50 text-amber-600 group-hover:bg-amber-500 group-hover:text-white' : 'bg-slate-50 text-slate-300'
            }`}>
              <Wallet size={24} />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Outstanding</div>
              <div className={`text-lg sm:text-xl font-black leading-none truncate ${pendingCount > 0 ? 'text-amber-700' : 'text-slate-900'}`}>
                {formatRupiah(pendingAmount)}
              </div>
              <div className="text-[11px] font-bold text-slate-400 mt-1">
                {pendingCount > 0 ? `${pendingCount} pesanan belum lunas` : 'Semua pesanan lunas'}
              </div>
            </div>
          </div>

          <div className="sm:col-span-2 bg-white border border-slate-100 rounded-3xl p-5 flex items-center gap-4 group">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-all ${
              (stats?.pendingKyc ?? 0) > 0 ? 'bg-amber-50 text-amber-600 group-hover:bg-amber-500 group-hover:text-white animate-pulse' : 'bg-slate-50 text-slate-300'
            }`}>
              <AlertCircle size={24} />
            </div>
            <div className="flex-1 flex items-center justify-between gap-4">
              <div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pending KYC</div>
                <div className={`text-2xl font-black leading-none ${(stats?.pendingKyc ?? 0) > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                  {stats?.pendingKyc ?? 0}
                </div>
              </div>
              <div className="text-right text-[11px] font-bold text-slate-400">
                Cocokkan data KTP sebelum aktivasi.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsPanel;
