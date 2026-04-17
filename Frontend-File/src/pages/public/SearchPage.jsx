import React from 'react';
import { XCircle, Loader2 } from 'lucide-react';
import { useSearchPage } from '../../hooks/useSearchPage';
import SearchHeader from '../../components/public/search/SearchHeader';
import SearchResultList from '../../components/public/search/SearchResultList';

export default function SearchPage() {
  const {
    activeSearch, isEditing, setIsEditing, formData, setFormData,
    motors, isLoading, error, handleUpdateSearch, handleRent, formatDate
  } = useSearchPage();

  if (!activeSearch.startDate || !activeSearch.endDate) return null;

  return (
    <div className="bg-slate-50 min-h-screen pb-20 font-sans text-slate-900">
      
      {/* HEADER & FORM PENCARIAN */}
      <SearchHeader 
        activeSearch={activeSearch} 
        isEditing={isEditing} 
        setIsEditing={setIsEditing} 
        formData={formData} 
        setFormData={setFormData} 
        handleUpdateSearch={handleUpdateSearch} 
        formatDate={formatDate}
      />

      {/* KONTEN LIST MOTOR */}
      <div className="max-w-4xl mx-auto px-4 -mt-10 relative z-20">
        
        {/* Ringkasan Hasil */}
        {!isLoading && !error && (
          <div className="bg-white px-6 py-4 rounded-2xl shadow-sm border border-slate-100 mb-6 flex justify-between items-center">
            <span className="font-bold text-slate-600 text-sm">Menampilkan {motors.length} armada tersedia</span>
            <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest bg-rose-50 px-3 py-1.5 rounded-lg">Harga Terbaik</span>
          </div>
        )}

        {/* State Error */}
        {error && (
          <div className="bg-red-50 text-red-600 p-6 rounded-[2rem] border border-red-100 text-center font-bold shadow-lg">
            <XCircle size={48} className="mx-auto mb-3 opacity-50" />{error}
          </div>
        )}

        {/* State Loading */}
        {isLoading && !error && (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2rem] shadow-sm border border-slate-100">
            <Loader2 size={48} className="text-rose-500 animate-spin mb-4" />
            <p className="font-bold text-slate-400 animate-pulse">Memperbarui ketersediaan armada...</p>
          </div>
        )}

        {/* State Kosong */}
        {!isLoading && !error && motors.length === 0 && (
          <div className="bg-white p-12 rounded-[2rem] shadow-sm border border-slate-100 text-center">
            <XCircle size={48} className="text-slate-300 mx-auto mb-4" />
            <h3 className="text-2xl font-black text-slate-900 mb-2">Armada Habis</h3>
            <p className="text-slate-500 font-medium">Mohon maaf, semua motor di lokasi tersebut sudah disewa. Silakan ubah tanggal atau lokasi.</p>
          </div>
        )}

        {/* Daftar Hasil (List View) */}
        {!isLoading && !error && motors.length > 0 && (
          <SearchResultList 
            motors={motors} 
            handleRent={handleRent} 
            pickupLocation={activeSearch.pickupLocation} 
          />
        )}
      </div>
      
    </div>
  );
}