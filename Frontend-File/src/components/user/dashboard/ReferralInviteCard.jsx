import React from 'react';
import { Copy, Gift } from 'lucide-react';

export default function ReferralInviteCard({ referralCode }) {
  return (
    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[2rem] p-6 sm:p-8 text-white relative overflow-hidden flex flex-col sm:flex-row justify-between items-center sm:items-end shadow-sm gap-6">
      <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none" />
      <div className="relative z-10 w-full sm:w-auto text-center sm:text-left">
        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/20 mb-4 mx-auto sm:mx-0">
          <Gift size={20} />
        </div>
        <h3 className="text-xl sm:text-2xl font-black mb-1 leading-tight drop-shadow-sm">
          Ajak Teman,
          <br />
          Dapat Cuan!
        </h3>
        <p className="text-indigo-100 text-xs sm:text-sm font-medium leading-relaxed max-w-xs mx-auto sm:mx-0">
          Dapatkan 50 Miles setiap teman mendaftar pakai kode Anda.
        </p>
      </div>
      <button
        onClick={() => {
          navigator.clipboard.writeText(referralCode || '');
          alert('Kode tersalin!');
        }}
        className="w-full sm:w-auto px-8 py-4 bg-white text-indigo-600 font-black rounded-xl text-sm flex items-center justify-center gap-2 hover:scale-105 transition-transform shadow-xl relative z-10 whitespace-nowrap"
      >
        <Copy size={18} /> Salin Kode
      </button>
    </div>
  );
}

