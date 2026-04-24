import React from 'react';
import { CarFront } from 'lucide-react';

export default function CarHero() {
  return (
    <div className="relative overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(244,63,94,0.35),transparent_55%),radial-gradient(circle_at_80%_30%,rgba(59,130,246,0.25),transparent_55%),radial-gradient(circle_at_40%_90%,rgba(16,185,129,0.18),transparent_60%)]" />
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
            <CarFront className="text-rose-400" size={22} />
          </div>
          <div className="text-[10px] font-black uppercase tracking-[0.32em] text-white/60">
            Katalog Mobil
          </div>
        </div>
        <h1 className="mt-6 text-4xl sm:text-5xl font-black tracking-tight leading-tight">
          Pilih Jadwal Dulu, Baru Pilih Mobil
        </h1>
        <p className="mt-3 text-white/70 font-medium max-w-2xl">
          Karena unit mobil terbatas dan bisa antar lintas kota, ketersediaan tergantung jam pickup dan durasi sewa.
        </p>
      </div>
    </div>
  );
}

