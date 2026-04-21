import React from 'react';
import { Search } from 'lucide-react';

const CatalogFilter = ({
  searchParams, setSearchParams,
  activeFilter, setActiveFilter,
  handleSearchSubmit, searchRef
}) => {
  return (
    <>
      <div ref={searchRef} className="bg-white p-6 sm:p-8 rounded-[3rem] shadow-xl shadow-slate-200/60 border border-slate-100 mb-12 relative z-20 -mt-20">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block ml-1">Kota Tujuan</label>
            <select
              value={searchParams.location}
              onChange={(e) => setSearchParams({ ...searchParams, location: e.target.value })}
              className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-rose-500 outline-none appearance-none cursor-pointer transition-all"
            >
              <option value="Yogyakarta">Yogyakarta</option>
              <option value="Solo">Solo</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block ml-1">Tanggal Ambil</label>
            <input type="date" required value={searchParams.startDate}
              onChange={(e) => setSearchParams({ ...searchParams, startDate: e.target.value })}
              className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-rose-500 outline-none" />
          </div>
          <div className="md:col-span-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block ml-1">Jam Ambil</label>
            <input type="time" required value={searchParams.startTime}
              onChange={(e) => setSearchParams({ ...searchParams, startTime: e.target.value })}
              className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-rose-500 outline-none" />
          </div>
          <div className="md:col-span-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block ml-1">Tanggal Kembali</label>
            <input type="date" required value={searchParams.endDate}
              onChange={(e) => setSearchParams({ ...searchParams, endDate: e.target.value })}
              className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-rose-500 outline-none" />
          </div>
          <div className="md:col-span-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block ml-1">Jam Kembali</label>
            <input type="time" required value={searchParams.endTime}
              onChange={(e) => setSearchParams({ ...searchParams, endTime: e.target.value })}
              className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-rose-500 outline-none" />
          </div>
          <div className="md:col-span-2 flex items-end">
            <button type="submit" className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-rose-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-200/20 active:scale-95">
              <Search size={20} /> <span className="md:hidden lg:inline">CARI</span>
            </button>
          </div>
        </form>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
        <h2 className="text-2xl font-black text-slate-900">Koleksi Tersedia</h2>
        <div className="flex p-1 bg-slate-200/50 rounded-xl w-full sm:w-auto">
          {['Semua', 'Yogyakarta', 'Solo'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab)}
              className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-sm font-black transition-all ${
                activeFilter === tab
                  ? 'bg-white text-rose-500 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

export default CatalogFilter;
