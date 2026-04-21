import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, MapPin, Calendar, Search } from 'lucide-react';

const SearchHeader = ({ 
  activeSearch, isEditing, setIsEditing, 
  formData, setFormData, handleUpdateSearch, formatDate 
}) => {
  return (
    <div className="bg-slate-900 text-white pt-16 pb-24 px-4 relative overflow-hidden transition-all duration-300">
      <div className="absolute top-0 right-0 w-80 h-80 bg-rose-500 rounded-full blur-[120px] opacity-20 -mr-20 -mt-20"></div>
      <div className="max-w-4xl mx-auto relative z-10">
        
        <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6 font-bold text-sm">
          <ChevronLeft size={16} /> Kembali Beranda
        </Link>
        
        <h1 className="text-3xl sm:text-4xl font-black mb-6 tracking-tight">Hasil Pencarian</h1>
        
        {/* LOGIKA TOGGLE FORM VS RINGKASAN */}
        {isEditing ? (
          <form onSubmit={handleUpdateSearch} className="bg-white p-4 rounded-[2rem] shadow-2xl grid grid-cols-1 md:grid-cols-6 gap-4 mt-2">
            <div className="flex-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Lokasi</label>
              <div className="relative">
                <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-500" />
                <select 
                  value={formData.pickupLocation} 
                  onChange={e => setFormData({...formData, pickupLocation: e.target.value})} 
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-rose-500 appearance-none border border-slate-100"
                >
                  <option value="Yogyakarta">Yogyakarta</option>
                  <option value="Solo">Solo</option>
                </select>
              </div>
            </div>

            <div className="flex-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Tanggal Ambil</label>
              <div className="relative">
                <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-500" />
                <input 
                  type="date" required 
                  value={formData.startDate} 
                  onChange={e => setFormData({...formData, startDate: e.target.value})} 
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-rose-500 border border-slate-100"
                />
              </div>
            </div>

            <div className="flex-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Jam Ambil</label>
              <input
                type="time"
                required
                value={formData.startTime}
                onChange={e => setFormData({...formData, startTime: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-rose-500 border border-slate-100"
              />
            </div>

            <div className="flex-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Tanggal Kembali</label>
              <div className="relative">
                <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-500" />
                <input 
                  type="date" required 
                  value={formData.endDate} 
                  onChange={e => setFormData({...formData, endDate: e.target.value})} 
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-rose-500 border border-slate-100"
                />
              </div>
            </div>

            <div className="flex-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Jam Kembali</label>
              <input
                type="time"
                required
                value={formData.endTime}
                onChange={e => setFormData({...formData, endTime: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-rose-500 border border-slate-100"
              />
            </div>

            <div className="flex items-end gap-2 mt-2 md:mt-0 md:col-span-2">
              <button type="button" onClick={() => { setIsEditing(false); setFormData({...activeSearch}); }} className="px-5 py-3 rounded-xl font-bold text-slate-400 hover:bg-slate-50 transition-colors border border-transparent">
                Batal
              </button>
              <button type="submit" className="px-6 py-3 bg-rose-500 text-white rounded-xl font-bold hover:bg-rose-600 transition-colors flex items-center gap-2 shadow-lg shadow-rose-500/30">
                <Search size={16} /> Update
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-white/10 backdrop-blur-md border border-white/10 p-4 rounded-2xl w-fit">
            <div className="flex items-center gap-2 text-slate-200 text-sm font-bold">
              <MapPin size={18} className="text-rose-500" /> {activeSearch.pickupLocation}
            </div>
            <div className="hidden sm:block text-slate-600">|</div>
            <div className="flex items-center gap-2 text-slate-200 text-sm font-bold">
              <Calendar size={18} className="text-rose-500" /> {formatDate(activeSearch.startDate, activeSearch.startTime)} - {formatDate(activeSearch.endDate, activeSearch.endTime)}
            </div>
            <button 
              onClick={() => setIsEditing(true)} 
              className="ml-4 text-[10px] bg-white text-slate-900 px-4 py-2 rounded-lg font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-colors"
            >
              Ubah Jadwal
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchHeader;
