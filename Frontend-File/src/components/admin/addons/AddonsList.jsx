import React, { useMemo, useState } from 'react';
import { Search, Edit, Trash2, Loader2, PackagePlus, Layers } from 'lucide-react';

const fmtRp = (n) =>
  `Rp ${(Number(n) || 0).toLocaleString('id-ID')}`;

const typeLabel = (t) => (t === 'package' ? 'Paket' : 'Add-on');

export default function AddonsList({ addons, isLoading, onEdit, onDelete }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return addons;
    return (addons || []).filter((a) =>
      String(a?.name || '').toLowerCase().includes(q) ||
      String(a?.description || '').toLowerCase().includes(q)
    );
  }, [addons, searchTerm]);

  const activeCount = (addons || []).filter((a) => Number(a?.is_active) === 1).length;

  return (
    <>
      <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 mb-8 flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Cari add-on atau paket..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>
        <div className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center">
          Aktif: {activeCount} item
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-20">
          <Loader2 className="animate-spin text-emerald-500" size={40} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center p-12 bg-white rounded-[2rem] border border-slate-100 shadow-sm text-slate-400 font-medium">
          Belum ada add-on atau paket. Tambahkan satu untuk mulai upsell saat checkout.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden group hover:shadow-xl transition-all"
            >
              <div className="p-6">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                        item.addon_type === 'package'
                          ? 'bg-indigo-50 text-indigo-600 border-indigo-100'
                          : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                      }`}>
                        {typeLabel(item.addon_type)}
                      </span>
                      <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                        Number(item.is_active) === 1
                          ? 'bg-slate-50 text-slate-600 border-slate-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {Number(item.is_active) === 1 ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </div>
                    <h3 className="text-lg font-black text-slate-900 leading-tight truncate">
                      {item.name}
                    </h3>
                    {item.description && (
                      <p className="text-xs text-slate-500 font-medium mt-2 line-clamp-2">
                        {item.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => onEdit(item)}
                      title="Edit"
                      className="p-1.5 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => onDelete(item.id)}
                      title="Hapus"
                      className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-slate-500">
                    {item.addon_type === 'package' ? <Layers size={16} /> : <PackagePlus size={16} />}
                    <span className="text-xs font-black">
                      {fmtRp(item.price)}
                    </span>
                  </div>
                  <div className="text-[11px] font-bold text-slate-400">
                    Qty: {Number(item.allow_quantity) === 1 ? `1-${item.max_qty || 1}` : '1'}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

