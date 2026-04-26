import React from 'react';
import { useNavigate } from 'react-router-dom';
import { XCircle, ShieldCheck, ChevronRight } from 'lucide-react';
import { useMotorCatalog } from '../../hooks/useMotorCatalog';
import MotorHero from '../../components/public/catalog/MotorHero';
import CatalogFilter from '../../components/public/catalog/CatalogFilter';
import MotorCard from '../../components/public/catalog/MotorCard';

export default function MotorCatalog() {
  const navigate = useNavigate();
  const { 
    searchParams, setSearchParams, 
    activeFilter, setActiveFilter, 
    isLoading, error, displayedMotors, 
    handleSearchSubmit, handleCardClick, searchRef 
  } = useMotorCatalog();

  return (
    <div className="bg-slate-50 min-h-screen pb-20 text-slate-900 font-sans">
      
      {/* 1. Header Hero */}
      <MotorHero />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20">
        
        {/* 2. Filter & Pencarian */}
        <CatalogFilter 
          searchParams={searchParams} setSearchParams={setSearchParams}
          activeFilter={activeFilter} setActiveFilter={setActiveFilter}
          handleSearchSubmit={handleSearchSubmit} searchRef={searchRef}
        />

        {/* 3. Error State */}
        {error && (
          <div className="bg-red-50 text-red-600 p-6 rounded-[2rem] border border-red-100 text-center font-bold shadow-lg mb-8">
            <XCircle size={48} className="mx-auto mb-2 opacity-50" /> {error}
          </div>
        )}

        {/* 4. Loading State */}
        {isLoading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white rounded-[2.5rem] p-5 shadow-sm border border-slate-100 animate-pulse">
                <div className="bg-slate-100 h-48 rounded-3xl mb-4 w-full"></div>
                <div className="bg-slate-100 h-6 w-3/4 rounded mb-2"></div>
                <div className="bg-slate-100 h-20 w-full rounded-xl mb-4"></div>
              </div>
            ))}
          </div>
        )}

        {/* 5. Konten Motor (Gallery View) */}
        {!isLoading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            {displayedMotors.map((motor) => (
              <MotorCard 
                key={motor.id} 
                motor={motor} 
                onClick={handleCardClick} 
              />
            ))}
          </div>
        )}

        {/* 6. Promo Loker (Banner Bawah) */}
        <div 
          onClick={() => navigate('/loker')}
          className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-[3rem] p-8 sm:p-12 text-white border border-slate-800 shadow-2xl mb-12 group cursor-pointer" 
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500 rounded-full blur-[100px] opacity-20 -mr-20 -mt-20 group-hover:opacity-40 transition-opacity duration-700"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="w-20 h-20 bg-white/5 backdrop-blur-lg rounded-3xl flex items-center justify-center border border-white/10 shrink-0">
                <ShieldCheck size={40} className="text-rose-500" />
              </div>
              <div>
                <h3 className="text-2xl sm:text-3xl font-black leading-tight mb-2">Bawa Koper Besar?</h3>
                <p className="text-slate-400 text-sm font-medium max-w-md">
                  Jangan biarkan barang bawaan membatasi eksplorasi Anda. Titipkan dengan aman di Smart Loker stasiun mulai dari Rp 10.000/jam.
                </p>
              </div>
            </div>
            
            <button className="w-full md:w-auto px-8 py-4 bg-rose-500 text-white font-black rounded-2xl text-sm hover:bg-rose-600 transition-all shadow-xl shadow-rose-500/20 flex items-center justify-center gap-2 shrink-0 group-hover:scale-105">
              SEWA LOKER <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className="text-center text-xs text-slate-500 font-semibold leading-relaxed max-w-2xl mx-auto">
          Unit dan warna kendaraan akan disesuaikan dengan stok yang tersedia. Foto di katalog adalah ilustrasi, kami akan berikan unit terbaik yang tersedia.
        </div>

      </div>
    </div>
  );
}
