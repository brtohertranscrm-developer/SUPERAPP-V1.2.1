import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronRight, 
  ChevronDown, 
  ChevronUp, 
  Bike, 
  Package, 
  CreditCard, 
  FileText,
  Calendar
} from 'lucide-react';

const RecentBookings = ({ bookings }) => {
  const navigate = useNavigate();
  const [expandedId, setExpandedId] = useState(null);

  const toggleAccordion = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getPaymentBadge = (status) => {
    if (status === 'paid') {
      return <span className="px-3 py-1 bg-green-100 text-green-600 rounded-lg text-[9px] font-black uppercase tracking-widest">Lunas</span>;
    }
    return <span className="px-3 py-1 bg-red-100 text-red-600 rounded-lg text-[9px] font-black uppercase tracking-widest">Belum Bayar</span>;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <span className="px-3 py-1 bg-orange-100 text-orange-600 rounded-lg text-[9px] font-black uppercase tracking-widest">Menunggu</span>;
      case 'active':
        return <span className="px-3 py-1 bg-blue-100 text-blue-600 rounded-lg text-[9px] font-black uppercase tracking-widest">Disewa</span>;
      case 'completed':
        return <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[9px] font-black uppercase tracking-widest">Selesai</span>;
      default:
        return <span className="px-3 py-1 bg-rose-100 text-rose-600 rounded-lg text-[9px] font-black uppercase tracking-widest">Batal</span>;
    }
  };

  return (
    <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
      {/* HEADER SECTION */}
      <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
        <h2 className="text-lg font-black text-slate-900">Transaksi Terbaru</h2>
        <button 
          onClick={() => navigate('/admin/booking')} 
          className="text-[10px] font-black uppercase tracking-widest text-rose-500 hover:text-slate-900 transition-colors flex items-center gap-1"
        >
          Lihat Semua <ChevronRight size={14} />
        </button>
      </div>

      {/* CONTENT SECTION */}
      <div className="p-4 sm:p-6 flex flex-col gap-4 bg-slate-50/10">
        {bookings.length === 0 ? (
          <div className="py-10 text-center">
            <p className="font-bold text-slate-400 text-sm">Belum ada transaksi terbaru.</p>
          </div>
        ) : (
          bookings.map((trx, index) => {
            // PERBAIKAN: Menggunakan order_id yang pasti unik sebagai identifier accordion
            const uniqueId = trx.id || trx.order_id || `trx-${index}`;
            const isExpanded = expandedId === uniqueId;

            return (
              <div 
                key={uniqueId} 
                className={`bg-white rounded-3xl border transition-all duration-300 overflow-hidden ${
                  isExpanded ? 'border-rose-200 shadow-md ring-4 ring-rose-50/50' : 'border-slate-100 hover:border-slate-300 shadow-sm'
                }`}
              >
                {/* === CARD HEADER (Selalu Tampil) === */}
                <div 
                  onClick={() => toggleAccordion(uniqueId)}
                  className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 cursor-pointer group"
                >
                  {/* Kiri: Avatar & Info User */}
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shadow-inner flex-shrink-0 transition-colors ${
                      isExpanded ? 'bg-rose-500 text-white' : 'bg-slate-900 text-white group-hover:bg-slate-800'
                    }`}>
                      {(trx.user_name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 text-base">{trx.user_name || 'Guest'}</h3>
                      <div className="flex items-center gap-1.5 text-slate-500 font-medium text-xs mt-0.5">
                        {trx.item_type === 'motor' ? <Bike size={14} className="text-indigo-500" /> : <Package size={14} className="text-orange-500" />} 
                        <span>{trx.item_name}</span>
                      </div>
                    </div>
                  </div>

                  {/* Kanan: Harga, Badge Status & Toggle */}
                  <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4 sm:gap-6 border-t border-slate-100 sm:border-0 pt-4 sm:pt-0">
                    <div className="text-left sm:text-right">
                      <p className="font-black text-slate-900 text-base">
                        Rp {trx.total_price.toLocaleString('id-ID')}
                      </p>
                      <p className="text-[10px] font-bold text-indigo-500 font-mono mt-0.5">
                        {trx.order_id}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="hidden sm:flex flex-col items-end gap-1">
                        {getPaymentBadge(trx.payment_status)}
                      </div>
                      <div className="hidden sm:flex flex-col items-end gap-1">
                         {getStatusBadge(trx.status)}
                      </div>
                      
                      <button className={`p-2 rounded-xl transition-colors ${
                        isExpanded ? 'bg-rose-100 text-rose-600' : 'bg-slate-50 text-slate-400 group-hover:text-slate-900 group-hover:bg-slate-100'
                      }`}>
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* === ACCORDION BODY (Detail Tambahan) === */}
                <div 
                  className={`grid transition-all duration-300 ease-in-out ${
                    isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="p-5 bg-slate-50/50 border-t border-slate-100">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        
                        {/* Kolom Kiri: Detail Esensial */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between sm:justify-start gap-2 text-sm">
                            <span className="flex items-center gap-2 text-slate-500 font-medium sm:w-32">
                              <CreditCard size={14} /> Status Bayar
                            </span>
                            <span>{getPaymentBadge(trx.payment_status)}</span>
                          </div>
                          <div className="flex items-center justify-between sm:justify-start gap-2 text-sm">
                            <span className="flex items-center gap-2 text-slate-500 font-medium sm:w-32">
                              <FileText size={14} /> Status Booking
                            </span>
                            <span>{getStatusBadge(trx.status)}</span>
                          </div>
                        </div>

                        {/* Kolom Kanan: Waktu / Aksi Tambahan */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between sm:justify-start gap-2 text-sm">
                            <span className="flex items-center gap-2 text-slate-500 font-medium sm:w-32">
                              <Calendar size={14} /> Tgl Transaksi
                            </span>
                            <span className="font-bold text-slate-800 text-xs">
                              {trx.created_at ? new Date(trx.created_at).toLocaleDateString('id-ID') : 'Sesuai Sistem'}
                            </span>
                          </div>
                        </div>

                      </div>

                      {/* Tombol Aksi di dalam Card */}
                      <div className="mt-5 pt-4 border-t border-slate-200 flex justify-end gap-3">
                        <button 
                          onClick={() => navigate(`/admin/invoice/${trx.order_id}`)}
                          className="px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-600 bg-white border border-slate-200 hover:border-slate-400 rounded-xl transition-all shadow-sm"
                        >
                          Lihat Invoice
                        </button>
                        <button 
                          onClick={() => navigate(`/admin/booking`)}
                          className="px-4 py-2 text-xs font-black uppercase tracking-widest text-white bg-slate-900 hover:bg-rose-500 rounded-xl transition-all shadow-sm"
                        >
                          Kelola Booking
                        </button>
                      </div>

                    </div>
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default RecentBookings;