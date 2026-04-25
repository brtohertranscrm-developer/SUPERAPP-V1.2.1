import React from 'react';
import { Truck } from 'lucide-react';

export default function InterCityOrderBanner({ onClick }) {
  return (
    <div
      onClick={onClick}
      className="cursor-pointer group relative overflow-hidden rounded-[2rem] bg-slate-900 p-6 sm:p-8 text-white shadow-xl"
    >
      <div className="pointer-events-none absolute -top-10 -right-10 w-48 h-48 rounded-full bg-rose-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-12 left-10 w-40 h-40 rounded-full bg-amber-400/10 blur-3xl" />

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div className="flex-1">
          <div className="inline-flex items-center gap-1.5 bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full mb-4">
            <Truck size={11} /> Layanan Baru
          </div>

          <h3 className="text-2xl sm:text-3xl font-black leading-tight mb-2">
            Motor di Kota Lain?
            <br />
            <span className="text-rose-400">Kita Kirimin!</span>
          </h3>
          <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-xs">
            Nggak nemu unit yang kamu mau di kotamu? Kami bisa kirim dari kota lain — Jogja atau Solo.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {['Min. 3 Hari', 'Booking H-1', 'Full Payment'].map((s) => (
              <span key={s} className="px-3 py-1 rounded-full bg-white/10 text-white text-[10px] font-black tracking-wide">
                {s}
              </span>
            ))}
          </div>
        </div>

        <div className="shrink-0">
          <div className="inline-flex items-center gap-2 bg-rose-500 group-hover:bg-rose-400 transition-colors text-white font-black px-6 py-4 rounded-2xl text-sm shadow-lg">
            <Truck size={18} /> Minta Unit Sekarang
          </div>
        </div>
      </div>
    </div>
  );
}

