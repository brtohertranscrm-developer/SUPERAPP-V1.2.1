import React, { useState } from 'react';
import { Search, Pencil, Trash2, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

const CATEGORY_MAP = {
  servis:    { label: 'Servis Armada',      cls: 'bg-blue-50 text-blue-600 border-blue-200' },
  bbm:       { label: 'BBM',                cls: 'bg-orange-50 text-orange-600 border-orange-200' },
  sewa:      { label: 'Sewa',               cls: 'bg-purple-50 text-purple-600 border-purple-200' },
  gaji:      { label: 'Gaji',               cls: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  marketing: { label: 'Marketing',          cls: 'bg-pink-50 text-pink-600 border-pink-200' },
  lainnya:   { label: 'Lainnya',            cls: 'bg-slate-50 text-slate-600 border-slate-200' }
};

const ExpenseTable = ({ data, isLoading, onEdit, onDelete }) => {
  const [expandedId, setExpandedId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  const toggleExpand = (id) => setExpandedId(expandedId === id ? null : id);

  const filtered = data.filter((e) => {
    const q = searchTerm.toLowerCase();
    const matchSearch =
      e.description?.toLowerCase().includes(q) ||
      e.created_by_name?.toLowerCase().includes(q) ||
      e.plate_number?.toLowerCase().includes(q);
    const matchCat = filterCategory === 'all' || e.category === filterCategory;
    return matchSearch && matchCat;
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 text-center text-slate-400 font-bold">
        Memuat data pengeluaran...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Filter + Search */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari deskripsi, nama pencatat, atau plat nomor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
        >
          <option value="all">Semua Kategori</option>
          {Object.entries(CATEGORY_MAP).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* Kartu */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 text-center text-slate-400 font-bold">
          {data.length === 0 ? 'Belum ada pengeluaran yang tercatat.' : 'Tidak ada data yang cocok.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((e) => {
            const isExpanded = expandedId === e.id;
            const catInfo = CATEGORY_MAP[e.category] || CATEGORY_MAP.lainnya;

            return (
              <div key={e.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col hover:shadow-md transition-all">

                {/* Header */}
                <div
                  onClick={() => toggleExpand(e.id)}
                  className="p-4 cursor-pointer hover:bg-slate-50 flex items-center justify-between gap-3 transition-colors"
                >
                  <div className="overflow-hidden flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${catInfo.cls}`}>
                        {catInfo.label}
                      </span>
                    </div>
                    <p className="text-base font-black text-slate-800">
                      Rp {e.amount?.toLocaleString('id-ID')}
                    </p>
                    <p className="text-[11px] text-slate-400">{e.expense_date}</p>
                  </div>
                  <div className="text-slate-400 shrink-0">
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </div>

                {/* Accordion Body */}
                {isExpanded && (
                  <div className="border-t border-slate-100 animate-in slide-in-from-top-2 fade-in duration-200">
                    <div className="p-4 space-y-3">

                      {e.description && (
                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Deskripsi</p>
                          <p className="text-sm text-slate-700">{e.description}</p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Dicatat oleh</p>
                          <p className="text-xs font-bold text-slate-700">{e.created_by_name || '-'}</p>
                        </div>
                        {e.plate_number && (
                          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Unit Motor</p>
                            <p className="text-xs font-bold font-mono text-slate-700">{e.plate_number}</p>
                          </div>
                        )}
                      </div>

                      {e.receipt_url && (
                        <a
                          href={e.receipt_url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-2.5 rounded-xl border border-indigo-100 transition-colors"
                        >
                          <ExternalLink size={14} /> Lihat Struk / Kwitansi
                        </a>
                      )}
                    </div>

                    {/* Aksi */}
                    <div className="p-3 bg-slate-50 border-t border-slate-100 flex gap-2">
                      <button
                        onClick={() => onEdit(e)}
                        className="flex-1 bg-white border border-slate-200 text-slate-600 font-bold py-2.5 rounded-xl text-xs hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-colors flex justify-center items-center gap-1.5 shadow-sm"
                      >
                        <Pencil size={14} /> Edit
                      </button>
                      <button
                        onClick={() => onDelete(e.id)}
                        className="flex-1 bg-white border border-red-200 text-red-600 font-bold py-2.5 rounded-xl text-xs hover:bg-red-50 transition-colors flex justify-center items-center gap-1.5 shadow-sm"
                      >
                        <Trash2 size={14} /> Hapus
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ExpenseTable;
