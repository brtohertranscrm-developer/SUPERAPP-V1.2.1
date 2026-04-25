import React from 'react';
import { Headset, LifeBuoy, MessageCircle } from 'lucide-react';

export default function HelpCenterCard({ supportWaHref, onCreateTicket }) {
  return (
    <div className="bg-slate-900 rounded-[2.5rem] p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
      <h3 className="text-sm font-black mb-4 uppercase tracking-widest flex items-center gap-2">
        <Headset size={18} className="text-rose-400" /> Pusat Bantuan
      </h3>
      <p className="text-[11px] sm:text-xs text-slate-400 mb-6 leading-relaxed font-medium">
        Butuh bantuan darurat saat menyewa atau komplain?
      </p>
      <div className="space-y-3">
        <a
          href={supportWaHref}
          target="_blank"
          rel="noreferrer"
          className="w-full py-3.5 bg-[#25D366] hover:bg-[#20bd5a] text-white font-black rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-all"
        >
          <MessageCircle size={18} /> Chat Admin (WA)
        </a>
        <button
          onClick={onCreateTicket}
          className="w-full py-3.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors backdrop-blur-sm"
        >
          <LifeBuoy size={18} /> Buat Tiket Komplain
        </button>
      </div>
    </div>
  );
}

