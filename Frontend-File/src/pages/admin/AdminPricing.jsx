import React, { useState } from 'react';
import { TrendingUp, Ticket, Zap, CalendarDays } from 'lucide-react';
import SurgeTab from '../../components/admin/pricing/SurgeTab';
import SeasonalTab from '../../components/admin/pricing/SeasonalTab';
import PromoTab from '../../components/admin/pricing/PromoTab';

export default function AdminPricing() {
  const [activeTab, setActiveTab] = useState('seasonal'); 

  return (
    <div className="animate-fade-in-up pb-10 px-4 sm:px-6">
      
      {/* HEADER */}
      <div className="mb-8 mt-4">
        <h1 className="text-2xl sm:text-3xl font-black text-brand-dark tracking-tight flex items-center gap-2">
          <TrendingUp className="text-blue-600" /> Dynamic Pricing
        </h1>
        <p className="text-gray-500 text-sm mt-1">Atur strategi harga otomatis berdasarkan sisa stok armada dan kalender liburan.</p>
      </div>

      {/* TAB NAVIGATION */}
      <div className="flex bg-white p-2 rounded-[2rem] shadow-sm border border-gray-100 mb-8 max-w-2xl">
        <button 
          onClick={() => setActiveTab('surge')}
          className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-3 rounded-2xl transition-all
            ${activeTab === 'surge' ? 'bg-amber-50 text-amber-600 shadow-sm border border-amber-100' : 'text-gray-400 hover:text-brand-dark hover:bg-gray-50'}`}
        >
          <Zap size={22} className={activeTab === 'surge' ? 'animate-pulse' : ''} />
          <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest">Surge</span>
        </button>

        <button 
          onClick={() => setActiveTab('seasonal')}
          className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-3 rounded-2xl transition-all
            ${activeTab === 'seasonal' ? 'bg-blue-50 text-blue-600 shadow-sm border border-blue-100' : 'text-gray-400 hover:text-brand-dark hover:bg-gray-50'}`}
        >
          <CalendarDays size={22} />
          <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest">Kalender</span>
        </button>

        <button 
          onClick={() => setActiveTab('promo')}
          className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-3 rounded-2xl transition-all
            ${activeTab === 'promo' ? 'bg-emerald-50 text-emerald-600 shadow-sm border border-emerald-100' : 'text-gray-400 hover:text-brand-dark hover:bg-gray-50'}`}
        >
          <Ticket size={22} />
          <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest">Promo</span>
        </button>
      </div>

      {/* KONTEN TAB */}
      <div>
        {activeTab === 'surge' && <SurgeTab />}
        {activeTab === 'seasonal' && <SeasonalTab />}
        {activeTab === 'promo' && <PromoTab />}
      </div>

    </div>
  );
}