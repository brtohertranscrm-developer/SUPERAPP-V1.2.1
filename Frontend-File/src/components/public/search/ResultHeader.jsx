import React from 'react';
import { Bike, X, Search, MapPin, ChevronDown, Calendar, ChevronRight } from 'lucide-react';

const ResultHeader = ({
  currentCity, setCurrentCity,
  startDate, setStartDate, today,
  endDate, setEndDate,
  totalDays,
  showSearchEdit, setShowSearchEdit
}) => {
  return (
    <div className="bg-slate-950 text-white pt-10 pb-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden border-b border-white/10 shadow-2xl shadow-black/20">
      <div className="max-w-6xl mx-auto relative z-10">
        
        {/* Title & Toggle Edit Button */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 animate-fade-in">
           <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
            <Bike className="text-rose-500" /> Eksplorasi {currentCity}
          </h1>
           <button 
             onClick={() => setShowSearchEdit(!showSearchEdit)} 
             className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all ${showSearchEdit ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30' : 'bg-white/10 hover:bg-white/20 border border-white/10 backdrop-blur-md'}`}
           >
             {showSearchEdit ? <><X size={18}/> Tutup Edit</> : <><Search size={18}/> Ubah Jadwal</>}
           </button>
        </div>
        
        {/* Form Edit Tampil Saat Tombol Diklik */}
        <div className={`transition-all duration-500 ease-in-out overflow-hidden ${showSearchEdit ? 'max-h-[700px] opacity-100 mb-8' : 'max-h-0 opacity-0'}`}>
          <form onSubmit={(e) => {e.preventDefault(); setShowSearchEdit(false);}} className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl text-slate-900 grid grid-cols-1 md:grid-cols-4 gap-5 items-end border border-slate-100 relative z-30">
            <div className="md:col-span-1">
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest ml-1">Titik Jemput</label>
              <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 cursor-pointer relative focus-within:ring-2 focus-within:ring-rose-500 focus-within:border-rose-500">
                <MapPin size={18} className="text-rose-500 z-10" />
                <select value={currentCity} onChange={(e) => setCurrentCity(e.target.value)} className="w-full bg-transparent outline-none font-bold text-slate-900 cursor-pointer text-sm appearance-none z-10 pr-6 relative">
                  <option value="Stasiun Lempuyangan">Stasiun Lempuyangan</option>
                  <option value="Stasiun Solo Balapan">Stasiun Solo Balapan</option>
                </select>
                <ChevronDown size={16} className="absolute right-4 text-slate-400 z-0 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest ml-1">Ambil</label>
              <input type="date" value={startDate} min={today} onChange={(e) => setStartDate(e.target.value)} className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-200 text-sm font-bold outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500 transition-all cursor-pointer" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest ml-1">Kembali</label>
              <input type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-200 text-sm font-bold outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500 transition-all cursor-pointer" />
            </div>
            <div>
              <button type="submit" className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-rose-500 transition-all shadow-xl shadow-slate-900/10 active:scale-95">
                Terapkan Filter Baru
              </button>
            </div>
          </form>
        </div>

        {/* Ringkasan Filter Tampil Saat Form Tertutup */}
        {!showSearchEdit && (
          <div className="flex flex-wrap items-center gap-4 text-sm bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-2xl w-fit shadow-lg animate-fade-in-up">
             <div className="flex items-center gap-2 text-rose-400 font-black tracking-wide bg-rose-500/10 px-3 py-1.5 rounded-xl"><MapPin size={18}/> {currentCity}</div>
             <div className="w-px h-5 bg-white/20"></div>
             <div className="flex items-center gap-2 text-slate-200 font-bold bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
               <Calendar size={18} className="text-rose-400"/> {startDate} <ChevronRight size={14} className="text-slate-400 mx-1"/> {endDate} 
             </div>
             <div className="bg-rose-500 text-white px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm">
               {totalDays} Hari
             </div>
          </div>
        )}
      </div>
      
      <div className="absolute top-0 right-0 w-80 h-80 bg-rose-500/10 rounded-full blur-[100px] -mr-20 -mt-20 pointer-events-none"></div>
    </div>
  );
};

export default ResultHeader;