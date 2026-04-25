import React from 'react';
import { ChevronRight, MapPin, Navigation } from 'lucide-react';

export default function QuickMenuCard({ onTripHistory, onLocker }) {
  return (
    <div className="bg-white rounded-[2.5rem] p-4 shadow-sm border border-slate-100 flex flex-col gap-2">
      <button
        onClick={onTripHistory}
        className="flex items-center justify-between p-4 bg-white hover:bg-slate-50 rounded-2xl transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-50 rounded-xl text-slate-600 group-hover:text-rose-500">
            <Navigation size={18} />
          </div>
          <span className="font-bold text-slate-900 text-sm">Riwayat Perjalanan</span>
        </div>
        <ChevronRight size={16} className="text-slate-300 group-hover:text-rose-500" />
      </button>

      <button
        onClick={onLocker}
        className="flex items-center justify-between p-4 bg-white hover:bg-slate-50 rounded-2xl transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-50 rounded-xl text-slate-600 group-hover:text-rose-500">
            <MapPin size={18} />
          </div>
          <span className="font-bold text-slate-900 text-sm">Sewa Smart Loker</span>
        </div>
        <ChevronRight size={16} className="text-slate-300 group-hover:text-rose-500" />
      </button>
    </div>
  );
}

