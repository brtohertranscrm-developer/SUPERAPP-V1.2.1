import React, { useState } from 'react';
import { Search, ChevronDown, ChevronUp, CheckCircle, XCircle, Clock, ExternalLink, AlertTriangle } from 'lucide-react';

const STATUS_MAP = {
  pending:  { label: 'Menunggu',    cls: 'bg-amber-50 text-amber-600 border-amber-200' },
  matched:  { label: 'Cocok',       cls: 'bg-green-50 text-green-600 border-green-200' },
  rejected: { label: 'Ditolak',     cls: 'bg-red-50 text-red-600 border-red-200' }
};

const BANK_LABELS = {
  bca:     'BCA',
  mandiri: 'Mandiri',
  cash:    'Cash',
  qris:    'QRIS / E-Wallet'
};

const ReconciliationTable = ({ data, isLoading, onMatch, onReject }) => {
  const [expandedId, setExpandedId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const toggleExpand = (id) => setExpandedId(expandedId === id ? null : id);

  const filteredData = data.filter((r) => {
    const q = searchTerm.toLowerCase();
    return (
      r.order_id?.toLowerCase().includes(q) ||
      r.customer_name?.toLowerCase().includes(q) ||
      r.bank_name?.toLowerCase().includes(q)
    );
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 text-center text-slate-400 font-bold">
        Memuat data rekonsiliasi...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari Order ID, nama pelanggan, atau bank..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Daftar Kartu */}
      {filteredData.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 text-center text-slate-400 font-bold">
          {data.length === 0 ? 'Belum ada bukti transfer yang diunggah.' : 'Tidak ada data yang cocok dengan pencarian.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredData.map((r) => {
            const isExpanded = expandedId === r.id;
            const statusInfo = STATUS_MAP[r.status] || STATUS_MAP.pending;

            // --- LOGIKA PENGECEKAN NOMINAL ---
            const isExactMatch = r.transfer_amount === r.total_price;
            const isUnderpaid = r.transfer_amount < r.total_price;
            const isOverpaid = r.transfer_amount > r.total_price;
            // ---------------------------------

            return (
              <div key={r.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col transition-all hover:shadow-md">

                {/* Header Kartu */}
                <div
                  onClick={() => toggleExpand(r.id)}
                  className="p-4 cursor-pointer hover:bg-slate-50 flex items-center justify-between gap-3 transition-colors"
                >
                  <div className="overflow-hidden">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-0.5 flex items-center gap-1">
                      Order ID 
                      {!isExactMatch && r.status === 'pending' && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" title="Ada selisih nominal"></span>}
                    </p>
                    <span className="font-mono text-sm font-black text-slate-800 truncate block">{r.order_id}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${statusInfo.cls}`}>
                      {statusInfo.label}
                    </span>
                    <div className="text-slate-400">
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>
                </div>

                {/* Body Accordion */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-white animate-in slide-in-from-top-2 fade-in duration-200">
                    <div className="p-4 space-y-3">

                      {/* Info Pelanggan & Item */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Pelanggan</p>
                          <p className="text-xs font-bold text-slate-800">{r.customer_name || '-'}</p>
                          <p className="text-[10px] text-slate-500">{r.customer_phone || ''}</p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Item Booking</p>
                          <p className="text-xs font-bold text-slate-800 truncate">{r.item_name || '-'}</p>
                          <p className="text-[10px] text-slate-500 uppercase">{r.item_type || ''}</p>
                        </div>
                      </div>

                      {/* Info Transfer dengan Visual Cues */}
                      <div className={`rounded-xl p-3 border flex justify-between items-center transition-colors ${
                        isExactMatch ? 'bg-blue-50 border-blue-100' : 'bg-red-50 border-red-200'
                      }`}>
                        <div>
                          <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${isExactMatch ? 'text-blue-400' : 'text-red-400'}`}>Transfer via</p>
                          <p className={`text-sm font-black ${isExactMatch ? 'text-blue-800' : 'text-red-800'}`}>{BANK_LABELS[r.bank_name] || r.bank_name}</p>
                          <p className={`text-[10px] ${isExactMatch ? 'text-blue-600' : 'text-red-600'}`}>{r.transfer_date}</p>
                        </div>
                        <div className="text-right flex flex-col items-end">
                          <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${isExactMatch ? 'text-blue-400' : 'text-red-400'}`}>Nominal Bukti</p>
                          <p className={`text-base font-black ${isExactMatch ? 'text-blue-700' : 'text-red-700'}`}>
                            Rp {r.transfer_amount?.toLocaleString('id-ID')}
                          </p>
                          <p className={`text-[10px] font-medium ${isExactMatch ? 'text-blue-500' : 'text-slate-600'}`}>
                            Tagihan: Rp {r.total_price?.toLocaleString('id-ID')}
                          </p>
                          
                          {/* BADGE PERINGATAN SELISIH */}
                          {!isExactMatch && r.status === 'pending' && (
                            <span className="text-[9px] font-black uppercase tracking-wider bg-red-100 text-red-600 px-2 py-0.5 rounded-full mt-1.5 flex items-center gap-1">
                              <AlertTriangle size={10} />
                              {isUnderpaid ? 'KURANG BAYAR!' : 'LEBIH BAYAR'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Bukti Transfer */}
                      {r.proof_url && (
                        <a
                          href={r.proof_url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-2.5 rounded-xl border border-indigo-100 transition-colors"
                        >
                          <ExternalLink size={14} /> Lihat Gambar Bukti Transfer
                        </a>
                      )}

                      {/* Catatan jika ada */}
                      {r.notes && (
                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Catatan</p>
                          <p className="text-xs text-slate-600">{r.notes}</p>
                        </div>
                      )}

                      {/* Rekonsiliasi oleh siapa */}
                      {r.reconciled_by_name && (
                        <p className="text-[10px] text-slate-400 font-medium">
                          Diproses oleh: {r.reconciled_by_name} — {r.reconciled_at ? new Date(r.reconciled_at).toLocaleDateString('id-ID') : ''}
                        </p>
                      )}
                    </div>

                    {/* Tombol Aksi — hanya tampil jika pending */}
                    {r.status === 'pending' && (
                      <div className="p-3 bg-slate-50 border-t border-slate-100 flex gap-2">
                        <button
                          onClick={() => {
                            if (isUnderpaid) {
                              alert("Tindakan diblokir! Nominal transfer kurang dari total tagihan pelanggan. Silakan tolak bukti transfer ini atau hubungi pelanggan.");
                              return;
                            }
                            onMatch(r.id);
                          }}
                          className={`flex-1 text-white font-bold py-2.5 rounded-xl text-xs flex justify-center items-center gap-1.5 shadow-sm transition-colors ${
                            isUnderpaid 
                              ? 'bg-slate-300 cursor-not-allowed hover:bg-slate-300' 
                              : 'bg-green-500 hover:bg-green-600'
                          }`}
                        >
                          <CheckCircle size={14} /> {isUnderpaid ? 'Nominal Kurang' : 'Konfirmasi Cocok'}
                        </button>
                        <button
                          onClick={() => onReject(r.id)}
                          className="flex-1 bg-white border border-red-200 text-red-600 font-bold py-2.5 rounded-xl text-xs hover:bg-red-50 transition-colors flex justify-center items-center gap-1.5 shadow-sm"
                        >
                          <XCircle size={14} /> Tolak
                        </button>
                      </div>
                    )}
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

export default ReconciliationTable;