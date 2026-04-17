import React from 'react';

const MotorHero = () => {
  return (
    <div className="bg-slate-900 text-white pt-16 pb-32 px-4 relative overflow-hidden text-center">
      <div className="absolute top-0 left-0 w-80 h-80 bg-rose-500 rounded-full blur-[120px] opacity-20 -ml-20 -mt-20"></div>
      <div className="relative z-10 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-white/10 border border-white/10 px-4 py-1.5 rounded-full mb-6 backdrop-blur-md">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Showcase Area</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-black mb-4 tracking-tight">Katalog Armada Premium</h1>
        <p className="text-slate-400 text-sm sm:text-base max-w-lg mx-auto">
          Jelajahi seluruh koleksi motor kami. Tentukan jadwal di bawah ini untuk melihat ketersediaan unit favorit Anda.
        </p>
      </div>
    </div>
  );
};

export default MotorHero;