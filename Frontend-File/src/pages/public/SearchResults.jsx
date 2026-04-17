import React from 'react';
import { Loader2, X } from 'lucide-react';
import { useSearchResults } from '../../hooks/useSearchResults';
import ResultHeader from '../../components/public/search/ResultHeader';
import ResultMotorCard from '../../components/public/search/ResultMotorCard';

export default function SearchResults() {
  const {
    currentCity, setCurrentCity, startDate, setStartDate, today, endDate, setEndDate, totalDays,
    showSearchEdit, setShowSearchEdit, filterType, setFilterType,
    selectedPackages, handlePackageChange,
    isLoading, error, filteredResults, navigateToCheckout
  } = useSearchResults();

  return (
    <div className="bg-slate-50 min-h-screen pb-20 font-sans text-slate-900 animate-fade-in-up relative">
      
      {/* 1. HEADER & FORM PENCARIAN */}
      <ResultHeader 
        currentCity={currentCity} setCurrentCity={setCurrentCity}
        startDate={startDate} setStartDate={setStartDate} today={today}
        endDate={endDate} setEndDate={setEndDate}
        totalDays={totalDays}
        showSearchEdit={showSearchEdit} setShowSearchEdit={setShowSearchEdit}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-20">
        
        {/* 2. TAB FILTER & RINGKASAN */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 scrollbar-hide">
            {['Semua', 'Matic', 'Maxi', 'Manual'].map((cat) => (
              <button key={cat} onClick={() => setFilterType(cat)} className={`px-6 py-3 rounded-full text-sm font-black whitespace-nowrap transition-all border shadow-sm ${filterType === cat ? 'bg-rose-500 border-rose-500 text-white shadow-rose-500/20' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                {cat}
              </button>
            ))}
          </div>
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-white px-5 py-3 rounded-full border border-slate-200 shadow-sm whitespace-nowrap flex items-center gap-1.5">
            <span className="text-rose-500 text-base">{filteredResults.length}</span> Armada Tersedia
          </div>
        </div>

        {/* 3. STATE LOADING / ERROR / KOSONG */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[3rem] shadow-sm border border-slate-100">
            <Loader2 className="animate-spin text-rose-500 mb-4" size={40} />
            <p className="text-slate-500 font-bold">Mencari armada terbaik untuk Anda...</p>
          </div>
        )}
        
        {error && !isLoading && (
          <div className="bg-red-50 text-red-600 p-8 rounded-[3rem] border border-red-100 text-center font-bold shadow-sm mb-8">
            <X size={48} className="mx-auto mb-3 opacity-50" /> 
            <p className="text-lg">{error}</p>
          </div>
        )}
        
        {!isLoading && !error && filteredResults.length === 0 && (
          <div className="text-center py-20 bg-white rounded-[3rem] border border-slate-100 shadow-sm animate-fade-in">
             <div className="text-6xl mb-4 opacity-70">🏍️</div>
             <h3 className="text-2xl font-black text-slate-900 mb-2">Armada Belum Tersedia</h3>
             <p className="text-slate-500 font-medium max-w-md mx-auto leading-relaxed">Maaf, semua unit di stasiun atau kategori ini sedang disewa. Cobalah ubah jadwal sewa atau ganti tipe motor lain.</p>
          </div>
        )}

        {/* 4. DAFTAR MOTOR (LIST VIEW) */}
        <div className="space-y-6">
          {!isLoading && !error && filteredResults.map((motor) => {
            const motorCity = motor.id % 2 !== 0 ? 'Stasiun Lempuyangan' : 'Stasiun Solo Balapan';
            const currentPackage = selectedPackages[motor.id] || '24';
            
            return (
              <ResultMotorCard 
                key={motor.id}
                motor={motor}
                motorCity={motorCity}
                totalDays={totalDays}
                currentPackage={currentPackage}
                handlePackageChange={handlePackageChange}
                onRent={navigateToCheckout}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}