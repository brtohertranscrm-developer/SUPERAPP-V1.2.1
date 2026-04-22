import React, { useState } from 'react';
import { Search, MapPin, ChevronDown, ChevronUp, Edit, Trash2, Package, Tag, Key, Zap, BatteryCharging } from 'lucide-react';

const ArmadaTable = ({ data, onEdit, onDelete, onManageUnit }) => {
  // State untuk Accordion, Search, dan Filter Lokasi
  const [expandedId, setExpandedId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLocation, setFilterLocation] = useState('');

  // Fungsi toggle accordion
  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // PERBAIKAN BUG LOKASI: 
  // Menetapkan lokasi standar agar selalu muncul, lalu digabungkan dengan lokasi dinamis (jika ada tambahan lokasi baru di data)
  const defaultLocations = ['Yogyakarta', 'Solo'];
  const dataLocations = data.map(item => item.location);
  const uniqueLocations = [...new Set([...defaultLocations, ...dataLocations])].filter(Boolean);

  // Filter data berdasarkan pencarian dan lokasi
  const filteredData = data.filter((motor) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      motor.name?.toLowerCase().includes(searchLower) ||
      motor.display_name?.toLowerCase().includes(searchLower) ||
      motor.id?.toString().toLowerCase().includes(searchLower);

    const matchLocation = filterLocation ? motor.location === filterLocation : true;

    return matchesSearch && matchLocation;
  });

  return (
    <div className="space-y-6">
      
      {/* --- BAGIAN FILTER & PENCARIAN --- */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-4">
        {/* Search Bar */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Cari Nama Motor atau ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
        </div>

        {/* Filter Lokasi */}
        <div className="relative w-full sm:w-auto min-w-[180px]">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MapPin size={18} className="text-slate-400" />
          </div>
          <select
            value={filterLocation}
            onChange={(e) => setFilterLocation(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-600 appearance-none"
          >
            <option value="">Semua Lokasi</option>
            {uniqueLocations.map((loc, idx) => (
              <option key={idx} value={loc}>{loc}</option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <ChevronDown size={16} className="text-slate-400" />
          </div>
        </div>
      </div>

      {/* --- DAFTAR DATA ARMADA (KARTU ACCORDION) --- */}
      {data.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center text-slate-500 font-medium">
          Belum ada data armada motor.
        </div>
      ) : filteredData.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center text-slate-500 font-medium">
          Tidak ada armada yang cocok dengan pencarian/filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredData.map((motor) => {
            const isExpanded = expandedId === motor.id;
            const isOutOfStock = motor.stock <= 0;

            return (
              <div 
                key={motor.id} 
                className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col transition-all duration-300 hover:shadow-md"
              >
                {/* HEADER KARTU (Tampil Minimalis) */}
                <div 
                  onClick={() => toggleExpand(motor.id)}
                  className="p-4 cursor-pointer hover:bg-slate-50 flex items-center justify-between gap-3 transition-colors"
                >
                  <div className="flex-1 overflow-hidden">
                    <h3 className="font-black text-slate-800 text-base truncate">{motor.name}</h3>
                    {!!motor.display_name && motor.display_name !== motor.name && (
                      <p className="text-[11px] font-bold text-slate-400 truncate mt-0.5">
                        Tampil ke user: {motor.display_name}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
                        <MapPin size={10} /> {motor.location}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
                        {motor.cc === 'Listrik' ? <BatteryCharging size={10} /> : <Zap size={10} />}
                        {motor.cc === 'Listrik' ? 'Listrik' : `${motor.cc || 125} cc`}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
                        {motor.category || 'Matic'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {/* Badge Stok Mini */}
                    <div className={`px-2 py-1 rounded-lg flex flex-col items-center justify-center border ${
                      isOutOfStock ? 'bg-red-50 border-red-100 text-red-600' : 'bg-blue-50 border-blue-100 text-blue-600'
                    }`}>
                      <span className="text-[10px] font-bold uppercase tracking-widest leading-none mb-0.5">Stok</span>
                      <span className="text-sm font-black leading-none">{motor.stock}</span>
                    </div>
                    
                    <div className="text-slate-400">
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>
                </div>

                {/* BODY & FOOTER KARTU (Konten Tersembunyi) */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-white animate-in slide-in-from-top-2 fade-in duration-200 flex flex-col">
                    
                    <div className="p-4 flex-1 space-y-3">
                      {/* Detail Info */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                          <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                            <Tag size={12} />
                            <p className="text-[10px] font-bold uppercase tracking-wide">ID Armada</p>
                          </div>
                          <p className="font-mono text-xs font-bold text-slate-700">{motor.id}</p>
                        </div>
                        
                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                          <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                            <Package size={12} />
                            <p className="text-[10px] font-bold uppercase tracking-wide">Status Stok</p>
                          </div>
                          <p className={`text-xs font-bold ${isOutOfStock ? 'text-red-500' : 'text-green-600'}`}>
                            {isOutOfStock ? 'Habis (Kosong)' : 'Tersedia'}
                          </p>
                        </div>
                      </div>

                      {/* Harga Base */}
                      <div className="bg-blue-50/50 rounded-xl p-3 flex justify-between items-center border border-blue-100">
                        <div>
                          <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wide mb-0.5">Tarif Dasar (24 Jam)</p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-base text-blue-700">
                            Rp {motor.base_price?.toLocaleString('id-ID')}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Tombol Aksi (Edit, Hapus, Kelola Plat) */}
                    <div className="p-3 bg-slate-50/50 border-t border-slate-100 flex flex-wrap gap-2">
                      <button 
                        onClick={() => onManageUnit(motor)} 
                        className="flex-1 basis-full sm:basis-0 bg-white border border-blue-200 text-blue-600 font-bold py-2.5 rounded-xl text-xs hover:bg-blue-50 transition-colors flex justify-center items-center gap-1.5 shadow-sm"
                      >
                        <Key size={14} /> Kelola Plat Nomor
                      </button>
                      <button 
                        onClick={() => onEdit(motor)} 
                        className="flex-1 bg-white border border-amber-200 text-amber-600 font-bold py-2.5 rounded-xl text-xs hover:bg-amber-50 transition-colors flex justify-center items-center gap-1.5 shadow-sm"
                      >
                        <Edit size={14} /> Edit Data
                      </button>
                      <button 
                        onClick={() => onDelete(motor.id)} 
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

export default ArmadaTable;
