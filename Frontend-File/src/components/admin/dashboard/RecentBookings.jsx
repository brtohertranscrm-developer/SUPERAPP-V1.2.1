import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronRight, 
  Bike, 
  Package, 
  Calendar,
  CreditCard
} from 'lucide-react';

const DEFAULT_LIMIT = 8;

const RecentBookings = ({ bookings, limit = DEFAULT_LIMIT }) => {
  const navigate = useNavigate();

  const getPaymentBadge = (status) => {
    if (status === 'paid') {
      return <span className="px-2.5 py-1 bg-green-100 text-green-700 rounded-lg text-[9px] font-black uppercase tracking-widest">Lunas</span>;
    }
    return <span className="px-2.5 py-1 bg-red-100 text-red-700 rounded-lg text-[9px] font-black uppercase tracking-widest">Belum</span>;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <span className="px-2.5 py-1 bg-orange-100 text-orange-700 rounded-lg text-[9px] font-black uppercase tracking-widest">Pending</span>;
      case 'active':
        return <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-lg text-[9px] font-black uppercase tracking-widest">Aktif</span>;
      case 'completed':
        return <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-[9px] font-black uppercase tracking-widest">Selesai</span>;
      default:
        return <span className="px-2.5 py-1 bg-rose-100 text-rose-700 rounded-lg text-[9px] font-black uppercase tracking-widest">Batal</span>;
    }
  };

  const all = Array.isArray(bookings) ? bookings : [];
  const total = all.length;
  const safeLimit = Math.max(1, Number(limit) || DEFAULT_LIMIT);
  const rows = all.slice(0, safeLimit);

  return (
    <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
      {/* HEADER SECTION */}
      <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
        <div>
          <h2 className="text-lg font-black text-slate-900 leading-tight">Transaksi Terbaru</h2>
          <p className="text-[11px] text-slate-400 font-semibold mt-1 flex items-center gap-1.5">
            <CreditCard size={12} /> Menampilkan {Math.min(rows.length, total)} dari {total}
          </p>
        </div>
        <button 
          onClick={() => navigate('/admin/booking')} 
          className="text-[10px] font-black uppercase tracking-widest text-rose-500 hover:text-slate-900 transition-colors flex items-center gap-1"
        >
          Lihat Semua <ChevronRight size={14} />
        </button>
      </div>

      {/* CONTENT SECTION */}
      <div className="p-4 sm:p-6 bg-slate-50/10">
        {rows.length === 0 ? (
          <div className="py-10 text-center">
            <p className="font-bold text-slate-400 text-sm">Belum ada transaksi terbaru.</p>
          </div>
        ) : (
          <div className="max-h-[420px] overflow-auto pr-1">
            <div className="flex flex-col gap-2">
              {rows.map((trx, index) => {
                const uniqueId = trx.id || trx.order_id || `trx-${index}`;
                const publicName = trx.user_name || 'Guest';
                const itemLabel = trx.item_name || '-';
                const amount = Number(trx.total_price) || 0;
                const ts = trx.created_at ? new Date(trx.created_at) : null;
                const orderId = trx.order_id || trx.id || '';
                const goInvoice = (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (orderId) navigate(`/admin/invoice/${orderId}`);
                };

                return (
                  <div
                    key={uniqueId}
                    onClick={goInvoice}
                    className="bg-white rounded-2xl border border-slate-100 hover:border-slate-200 shadow-sm transition-colors px-4 py-3 flex items-center gap-3 cursor-pointer"
                    title="Klik untuk membuka invoice"
                  >
                    <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-sm shrink-0">
                      {publicName.charAt(0).toUpperCase()}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="font-black text-slate-900 text-sm truncate">{publicName}</div>
                        <div className="hidden sm:flex items-center gap-2 shrink-0">
                          {getPaymentBadge(trx.payment_status)}
                          {getStatusBadge(trx.status)}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mt-0.5 min-w-0">
                        {trx.item_type === 'motor'
                          ? <Bike size={14} className="text-indigo-500 shrink-0" />
                          : <Package size={14} className="text-orange-500 shrink-0" />
                        }
                        <span className="truncate">{itemLabel}</span>
                        {orderId && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="font-mono text-[11px] text-indigo-500 truncate">{orderId}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <div className="font-black text-slate-900 text-sm">Rp {amount.toLocaleString('id-ID')}</div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-400 font-semibold">
                        <Calendar size={12} />
                        <span>{ts ? ts.toLocaleDateString('id-ID') : 'Sistem'}</span>
                      </div>
                    </div>

                    <div className="sm:hidden flex flex-col items-end gap-1 shrink-0">
                      {getPaymentBadge(trx.payment_status)}
                      {getStatusBadge(trx.status)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentBookings;
