import React, { useMemo, useState } from 'react';
import { Search, Edit, Trash2, Image as ImageIcon, Loader2, Eye, EyeOff, MapPinned } from 'lucide-react';

const PartnersList = ({ partners, isLoading, onEdit, onDelete, onToggleActive }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return partners;
    return partners.filter((p) => {
      const name = String(p?.name || '').toLowerCase();
      const cat = String(p?.category || '').toLowerCase();
      const city = String(p?.city || '').toLowerCase();
      const headline = String(p?.headline || '').toLowerCase();
      return name.includes(q) || cat.includes(q) || city.includes(q) || headline.includes(q);
    });
  }, [partners, searchTerm]);

  return (
    <>
      <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 mb-8 flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Cari partner, kategori, kota..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center">
          Total: {partners.length} Partner
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-20"><Loader2 className="animate-spin text-indigo-500" size={40} /></div>
      ) : partners.length === 0 ? (
        <div className="text-center p-12 bg-white rounded-[2rem] border border-slate-100 shadow-sm text-slate-400 font-medium">
          Belum ada partner yang ditambahkan.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((p) => {
            const active = Number(p?.is_active) === 1;
            return (
              <div key={p.id} className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col sm:flex-row group hover:shadow-xl transition-all">
                <div className="sm:w-48 h-48 bg-slate-100 shrink-0 overflow-hidden relative">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon size={40} /></div>
                  )}
                  <div className="absolute top-4 left-4 flex items-center gap-2">
                    <span className="px-2.5 py-1 bg-slate-900/80 text-white rounded-lg text-[9px] font-black uppercase tracking-widest border border-white/10">
                      {p.category || 'Partner'}
                    </span>
                    <span className="px-2.5 py-1 bg-white/90 text-slate-700 rounded-lg text-[9px] font-black uppercase tracking-widest border border-white/40">
                      {p.city || '—'}
                    </span>
                  </div>
                </div>
                <div className="p-6 flex flex-col flex-1">
                  <div className="flex justify-between items-start mb-2 gap-3">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                        active ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {active ? 'Aktif' : 'Nonaktif'}
                      </span>
                      {p.maps_url ? (
                        <a
                          href={p.maps_url}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Buka Maps"
                        >
                          <MapPinned size={16} />
                        </a>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onToggleActive?.(p.id, !active)}
                        title={active ? 'Nonaktifkan' : 'Aktifkan'}
                        className="p-1.5 text-slate-300 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        {active ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                      <button onClick={() => onEdit(p)} title="Edit Partner" className="p-1.5 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => onDelete(p.id)} title="Hapus" className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <h3 className="text-lg font-black text-slate-900 leading-tight mb-1 line-clamp-2">{p.name}</h3>
                  <p className="text-xs text-slate-500 font-medium line-clamp-2 mb-3">{p.headline || p.promo_text || '—'}</p>
                  <div className="mt-auto flex items-center justify-between gap-3">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Sort: {Number(p.sort_order) || 0}
                    </div>
                    {p.cta_url ? (
                      <a
                        href={p.cta_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] font-black text-indigo-600 hover:text-slate-900 transition-colors"
                      >
                        {p.cta_label || 'Lihat Promo'} →
                      </a>
                    ) : (
                      <span className="text-[11px] font-black text-slate-300">Tanpa link</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};

export default PartnersList;

