import React from 'react';
import { Trophy } from 'lucide-react';

export default function TopTravellersCard({ topTravellers, onStartAdventure }) {
  return (
    <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-100">
      <h3 className="text-sm font-black text-slate-900 mb-4 uppercase tracking-widest flex items-center gap-2">
        <Trophy size={16} className="text-amber-500" /> Top Traveller
      </h3>
      <div className="space-y-4">
        {topTravellers.length > 0 ? (
          topTravellers.map((member, i) => {
            const colors = [
              'bg-amber-100 text-amber-700',
              'bg-slate-100 text-slate-600',
              'bg-orange-100 text-orange-700',
            ];
            return (
              <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${colors[i] || colors[1]}`}>
                    #{i + 1}
                  </div>
                  <span className="font-bold text-sm text-slate-900">{member.name}</span>
                </div>
                <span className="text-xs font-black text-rose-500">{member.miles} Miles</span>
              </div>
            );
          })
        ) : (
          <div className="text-center p-6 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
            <Trophy size={32} className="text-slate-300 mb-3 mx-auto" />
            <h4 className="text-sm font-black text-slate-900 mb-1">Takhta Masih Kosong!</h4>
            <button
              onClick={onStartAdventure}
              className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-rose-500 transition-colors"
            >
              Mulai Petualangan
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

