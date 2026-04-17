import React from 'react';
import { Search } from 'lucide-react';

const SupportToolbar = ({ filterStatus, setFilterStatus, searchTerm, setSearchTerm }) => {
  return (
    <div className="bg-white p-4 sm:p-5 rounded-[2rem] shadow-sm border border-slate-100 mb-8 flex flex-col md:flex-row gap-4 justify-between items-center">
      
      {/* Filter Tab */}
      <div className="flex bg-slate-50 p-1.5 rounded-xl border border-slate-100 w-full md:w-auto">
        {['Semua', 'pending', 'completed'].map(status => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 rounded-lg text-xs font-black transition-all flex-1 md:flex-none text-center capitalize
              ${filterStatus === status ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-900'}`}
          >
            {status === 'pending' ? 'Butuh Aksi' : status === 'completed' ? 'Selesai' : status}
          </button>
        ))}
      </div>

      {/* Search Input */}
      <div className="relative w-full md:w-80">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input 
          type="text" 
          placeholder="Cari No. Tiket, Nama, Judul..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-amber-500 outline-none shadow-sm"
        />
      </div>
    </div>
  );
};

export default SupportToolbar;