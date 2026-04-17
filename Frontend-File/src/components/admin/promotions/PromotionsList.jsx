import React, { useState } from 'react';
import { Search, Edit, Trash2, Image as ImageIcon, Loader2 } from 'lucide-react';

const PromotionsList = ({ promos, isLoading, onEdit, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPromos = promos.filter(p => 
    (p.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.code || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      {/* SEARCH BAR */}
      <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 mb-8 flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" placeholder="Cari judul atau kode promo..." 
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>
        <div className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center">
          Aktif: {promos.length} Banner
        </div>
      </div>

      {/* LIST PROMO */}
      {isLoading ? (
        <div className="flex justify-center p-20"><Loader2 className="animate-spin text-emerald-500" size={40} /></div>
      ) : promos.length === 0 ? (
        <div className="text-center p-12 bg-white rounded-[2rem] border border-slate-100 shadow-sm text-slate-400 font-medium">
          Belum ada banner promo yang ditambahkan.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredPromos.map((promo) => (
            <div key={promo.id} className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col sm:flex-row group hover:shadow-xl transition-all">
              <div className="sm:w-48 h-48 bg-slate-100 shrink-0 overflow-hidden relative">
                {promo.image ? (
                  <img src={promo.image} alt={promo.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon size={40}/></div>
                )}
              </div>
              <div className="p-6 flex flex-col flex-1">
                <div className="flex justify-between items-start mb-2">
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-emerald-100">
                    {promo.tag}
                  </span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => onEdit(promo)} title="Edit Promo" className="p-1.5 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                      <Edit size={16} />
                    </button>
                    <button onClick={() => onDelete(promo.id)} title="Hapus Permanen" className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <h3 className="text-lg font-black text-slate-900 leading-tight mb-2 line-clamp-2">{promo.title}</h3>
                <p className="text-xs text-slate-500 font-medium line-clamp-2 mb-4">{promo.desc}</p>
                <div className="mt-auto flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Kode Voucher</span>
                    <span className="font-mono font-black text-indigo-500">{promo.code}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default PromotionsList;