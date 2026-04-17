import React from 'react';
import { Ticket, Lock, Gift, Coffee } from 'lucide-react';

const RedeemCatalog = ({ currentMiles, isRedeeming, onRedeem }) => {
  
  // Data statis katalog reward
  const rewardsList = [
    { id: 1, title: 'Diskon 50% Sewa Motor 1 Hari', category: 'Voucher Sewa', cost: 1000, icon: <Ticket size={24} />, color: 'bg-rose-50 text-brand-primary', desc: 'Berlaku untuk semua tipe motor Matic dan Maxi.' },
    { id: 2, title: 'Gratis Akses Smart Loker 24 Jam', category: 'Fasilitas', cost: 500, icon: <Lock size={24} />, color: 'bg-blue-50 text-blue-600', desc: 'Simpan barang bawaan Anda dengan aman tanpa biaya tambahan.' },
    { id: 3, title: 'T-Shirt Exclusive Brother Trans', category: 'Merchandise', cost: 2500, icon: <Gift size={24} />, color: 'bg-orange-50 text-orange-600', desc: 'Kaos premium edisi terbatas khusus untuk Platinum Rider.' },
    { id: 4, title: 'Voucher Kopi Teman Perjalanan', category: 'F&B', cost: 300, icon: <Coffee size={24} />, color: 'bg-amber-50 text-amber-700', desc: 'Tukarkan dengan 1 Es Kopi Susu di garasi kami.' }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {rewardsList.map((reward) => {
        const isAffordable = currentMiles >= reward.cost;
        
        return (
          <div key={reward.id} className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-2xl ${reward.color}`}>{reward.icon}</div>
                <div className={`text-xs font-bold px-3 py-1 rounded-lg ${isAffordable ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-400'}`}>
                  {reward.cost} Miles
                </div>
              </div>
              <h3 className="font-bold text-slate-900 mb-2">{reward.title}</h3>
              <p className="text-xs text-slate-500 mb-6">{reward.desc}</p>
            </div>

            <button 
              onClick={() => onRedeem(reward)}
              disabled={!isAffordable || isRedeeming}
              className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all ${isAffordable ? 'bg-rose-500 text-white hover:bg-slate-900 shadow-lg active:scale-95' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
            >
              {isRedeeming ? 'Memproses...' : isAffordable ? 'Tukar Sekarang' : 'Miles Tidak Cukup'}
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default RedeemCatalog;