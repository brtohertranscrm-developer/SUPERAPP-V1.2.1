import React from 'react';
import { Award } from 'lucide-react';

const MilesCard = ({ currentMiles }) => {
  return (
    <div className="bg-gradient-to-br from-rose-600 to-rose-800 rounded-[2rem] p-8 text-white mb-10 flex flex-col md:flex-row justify-between items-center gap-6 shadow-xl">
      <div>
        <h1 className="text-2xl font-bold mb-2">Tukar BrotherMiles Anda</h1>
        <p className="text-white/80 text-sm">Gunakan poin untuk keuntungan eksklusif.</p>
      </div>
      <div className="bg-white/10 backdrop-blur-md border border-white/20 p-5 rounded-3xl text-center min-w-[200px]">
        <div className="text-[10px] font-black uppercase tracking-widest mb-1 text-white/70">Saldo Miles Anda</div>
        <div className="text-3xl font-black flex items-center justify-center gap-2">
          <Award className="text-amber-400"/> {currentMiles.toLocaleString('id-ID')}
        </div>
      </div>
    </div>
  );
};

export default MilesCard;