import React from 'react';
import { Search } from 'lucide-react';

const UsersToolbar = ({ filterKyc, setFilterKyc, searchTerm, setSearchTerm, totalUsers }) => {
  return (
    <div className="bg-white p-3 md:p-5 rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-slate-100 mb-6 md:mb-8 flex flex-col xl:flex-row gap-3 md:gap-4 justify-between items-center">
      
      {/* Kumpulan Tombol Filter */}
      <div className="flex bg-slate-50 p-1.5 rounded-xl border border-slate-100 w-full xl:w-auto overflow-x-auto hide-scrollbar">
        {['Semua', 'pending', 'verified', 'unverified', 'rejected'].map(status => (
          <button
            key={status} onClick={() => setFilterKyc(status)}
            className={`px-3 py-2 md:px-4 md:py-2.5 rounded-lg text-[11px] md:text-xs font-black transition-all flex-1 xl:flex-none text-center capitalize whitespace-nowrap
              ${filterKyc === status ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-900'}`}
          >
            {status === 'pending' ? 'Menunggu' : 
             status === 'verified' ? 'Terverifikasi' : 
             status === 'unverified' ? 'Belum Verif' : 
             status === 'rejected' ? 'Ditolak' : status}
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row w-full xl:w-auto items-center gap-3">
        {/* Indikator Total */}
        <div className="flex items-center gap-2 text-xs md:text-sm font-bold text-slate-500 bg-slate-50 px-4 py-2.5 md:py-3 border border-slate-200 rounded-xl shadow-sm w-full sm:w-auto justify-center whitespace-nowrap">
          Total: <span className="text-purple-500 font-black">{totalUsers} Pengguna</span>
        </div>
        
        {/* Input Pencarian */}
        <div className="relative w-full sm:w-72 md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Cari Nama, Email, No. HP..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="w-full pl-10 md:pl-11 pr-4 py-2.5 md:py-3 bg-white border border-slate-200 rounded-xl text-xs md:text-sm font-bold focus:ring-2 focus:ring-purple-500 outline-none shadow-sm" 
          />
        </div>
      </div>
      
    </div>
  );
};

export default UsersToolbar;