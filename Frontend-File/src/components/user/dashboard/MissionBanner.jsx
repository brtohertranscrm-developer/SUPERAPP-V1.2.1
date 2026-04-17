import React from 'react';

export default function MissionBanner({ onClick }) {
  return (
    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 mb-6 text-white shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="bg-white/20 p-3 rounded-full text-3xl shrink-0">
          🎁
        </div>
        <div>
          <h3 className="text-xl font-bold mb-1">Selesaikan Misi Pertamamu!</h3>
          <p className="text-blue-100 text-sm">
            Pahami panduan sewa Brother Trans dan langsung klaim <span className="font-bold text-yellow-300">500 Miles Poin</span> untuk diskon sewa pertamamu.
          </p>
        </div>
      </div>
      <button 
        onClick={onClick}
        className="bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold py-2.5 px-6 rounded-xl whitespace-nowrap transition-transform transform hover:scale-105 active:scale-95 shadow-md flex items-center gap-2"
      >
        <span>Mulai Misi</span>
        <span className="text-lg">🚀</span>
      </button>
    </div>
  );
}
