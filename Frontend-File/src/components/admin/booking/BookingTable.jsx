import React, { useState, useMemo, memo, useCallback } from 'react';
import { Search, Calendar, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';

const fmtRp   = (n) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;
const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—';

const STATUS_BOOKING = {
  active:    { label: 'Active',    cls: 'bg-blue-500 text-white' },
  completed: { label: 'Completed', cls: 'bg-emerald-500 text-white' },
  cancelled: { label: 'Cancelled', cls: 'bg-red-500 text-white' },
  pending:   { label: 'Pending',   cls: 'bg-amber-400 text-white' }
};

// ==========================================
// HELPER FINANSIAL (Fallback jika dari backend 0)
// ==========================================
const getFinancials = (b) => {
  if (!b) return { total: 0, paid: 0, outstanding: 0 };
  const total = b.total_price || (
    (b.base_price || 0) - (b.discount_amount || 0) + (b.service_fee || 0) +
    (b.extend_fee || 0) + (b.addon_fee || 0) + (b.delivery_fee || 0)
  );
  const paid = b.paid_amount || 0;
  const outstanding = b.outstanding_amount !== undefined 
    ? b.outstanding_amount 
    : Math.max(0, total - paid);
    
  return { total, paid, outstanding };
};

// ==========================================
// KARTU BOOKING — di-memo agar tidak re-render
// ==========================================
const BookingCard = memo(({ b, isExpanded, onToggle, onEdit }) => {
  const { total, paid, outstanding } = getFinancials(b);
  const hasOutstanding = outstanding > 0;
  const statusCfg      = STATUS_BOOKING[b.status] || STATUS_BOOKING.pending;

  return (
    <div className={`bg-white rounded-2xl shadow-sm border overflow-hidden flex flex-col transition-shadow duration-200 hover:shadow-md ${
      hasOutstanding ? 'border-red-200' : 'border-slate-200'
    }`}>

      {/* HEADER */}
      <div
        onClick={onToggle}
        className="p-4 cursor-pointer hover:bg-slate-50 flex items-center justify-between gap-3 transition-colors"
      >
        <div className="overflow-hidden flex-1">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">Order ID</p>
          <span className="font-mono text-sm font-black text-slate-800 block truncate">{b.order_id}</span>
          {hasOutstanding && (
            <span className="inline-block mt-1 text-[10px] font-black text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-md uppercase">
              Outstanding {fmtRp(outstanding)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wider uppercase ${statusCfg.cls}`}>
            {statusCfg.label}
          </span>
          {isExpanded ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
        </div>
      </div>

      {/* BODY ACCORDION */}
      {isExpanded && (
        <div className="border-t border-slate-100 animate-in slide-in-from-top-2 fade-in duration-200 flex flex-col">
          <div className="p-4 space-y-3">

            {/* Pelanggan & Item */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Pelanggan</p>
                <p className="font-bold text-sm text-slate-800 truncate">{b.user_name}</p>
                <p className="text-xs text-slate-500">{b.user_phone}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Item</p>
                <p className="font-bold text-sm text-slate-800 truncate">{b.item_name}</p>
                <span className="inline-block px-1.5 py-0.5 bg-slate-200 text-slate-600 text-[10px] rounded font-bold uppercase">
                  {b.item_type}
                </span>
              </div>
            </div>

            {/* Tanggal */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1.5">Durasi Sewa</p>
              <p className="text-xs font-medium text-slate-700 text-center">
                {fmtDate(b.start_date)}
                <span className="mx-2 text-slate-300">→</span>
                {fmtDate(b.end_date)}
              </p>
            </div>

            {/* Harga */}
            <div className={`rounded-xl p-3 border ${hasOutstanding ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
              <div className="flex justify-between items-center mb-1.5">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Pembayaran</p>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase ${
                  b.payment_status === 'paid'     ? 'bg-emerald-100 text-emerald-700' :
                  b.payment_status === 'refunded' ? 'bg-purple-100 text-purple-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {b.payment_status === 'paid' ? 'Lunas' : b.payment_status === 'refunded' ? 'Refund' : 'Belum Bayar'}
                </span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-slate-500">Total tagihan</span>
                <span className="font-black text-slate-800">{fmtRp(total)}</span>
              </div>
              {paid > 0 && (
                <div className="flex justify-between text-xs mt-0.5">
                  <span className="text-slate-400">Dibayar</span>
                  <span className="font-bold text-emerald-600">{fmtRp(paid)}</span>
                </div>
              )}
              {hasOutstanding && (
                <div className="flex justify-between text-xs mt-0.5">
                  <span className="text-red-500 font-bold">Outstanding</span>
                  <span className="font-black text-red-600">{fmtRp(outstanding)}</span>
                </div>
              )}

              {/* Komponen harga breakdown */}
              {(b.base_price > 0 || b.service_fee > 0 || b.extend_fee > 0 || b.addon_fee > 0 || b.delivery_fee > 0 || b.discount_amount > 0) && (
                <div className="mt-2 pt-2 border-t border-slate-200 space-y-0.5">
                  {b.base_price     > 0 && <div className="flex justify-between text-[11px] text-slate-500"><span>Sewa dasar</span><span>{fmtRp(b.base_price)}</span></div>}
                  {b.service_fee    > 0 && <div className="flex justify-between text-[11px] text-slate-500"><span>Biaya layanan</span><span>{fmtRp(b.service_fee)}</span></div>}
                  {b.extend_fee     > 0 && <div className="flex justify-between text-[11px] text-slate-500"><span>Perpanjangan</span><span>{fmtRp(b.extend_fee)}</span></div>}
                  {b.addon_fee      > 0 && <div className="flex justify-between text-[11px] text-slate-500"><span>Addon</span><span>{fmtRp(b.addon_fee)}</span></div>}
                  {b.delivery_fee   > 0 && <div className="flex justify-between text-[11px] text-slate-500"><span>Antar/jemput</span><span>{fmtRp(b.delivery_fee)}</span></div>}
                  {b.discount_amount > 0 && (
                    <div className="flex justify-between text-[11px] text-emerald-600">
                      <span>Diskon {b.promo_code ? `(${b.promo_code})` : ''}</span>
                      <span>− {fmtRp(b.discount_amount)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Catatan admin */}
            {b.price_notes && (
              <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                <p className="text-[10px] text-amber-600 font-black uppercase tracking-widest mb-1">Catatan Admin</p>
                <p className="text-xs text-amber-800">{b.price_notes}</p>
              </div>
            )}

          </div>

          {/* Tombol */}
          <div className="p-3 bg-slate-50/50 border-t border-slate-100">
            <button
              onClick={() => onEdit(b)}
              className="w-full bg-blue-600 text-white font-black py-2.5 rounded-xl text-sm hover:bg-blue-700 transition-colors shadow-sm"
            >
              Detail &amp; Update
            </button>
          </div>
        </div>
      )}
    </div>
  );
});
BookingCard.displayName = 'BookingCard';

// ==========================================
// KOMPONEN UTAMA
// ==========================================
const BookingTable = ({ data, onEdit }) => {
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [searchTerm,    setSearchTerm]    = useState('');
  const [filterDate,    setFilterDate]    = useState('');
  const [filterPayment, setFilterPayment] = useState('all');

  // Debounce search
  const debouncedSearch = useDebouncedValue(searchTerm, 300);

  // Toggle accordion
  const toggleExpand = useCallback((orderId) => {
    setExpandedOrderId(prev => prev === orderId ? null : orderId);
  }, []);

  const handleEdit = useCallback((b) => {
    onEdit(b);
  }, [onEdit]);

  // Format tanggal
  const formatDateForCompare = useCallback((dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  // Summary outstanding (DIUPDATE menggunakan helper getFinancials)
  const { totalOutstanding, countOutstanding } = useMemo(() => {
    return data.reduce((acc, b) => {
      const { outstanding } = getFinancials(b);
      if (outstanding > 0) {
        acc.totalOutstanding += outstanding;
        acc.countOutstanding += 1;
      }
      return acc;
    }, { totalOutstanding: 0, countOutstanding: 0 });
  }, [data]);

  // Filter data (DIUPDATE agar cek filter outstanding pakai helper)
  const filteredData = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    return data.filter((b) => {
      const matchSearch = !q ||
        b.order_id?.toLowerCase().includes(q) ||
        b.user_name?.toLowerCase().includes(q) ||
        b.user_phone?.includes(q);

      const matchDate = !filterDate ||
        formatDateForCompare(b.start_date) === filterDate ||
        formatDateForCompare(b.end_date) === filterDate;

      const { outstanding } = getFinancials(b);
      const matchPayment =
        filterPayment === 'all'         ? true :
        filterPayment === 'outstanding' ? (outstanding > 0) :
        b.payment_status === filterPayment;

      return matchSearch && matchDate && matchPayment;
    });
  }, [data, debouncedSearch, filterDate, filterPayment, formatDateForCompare]);

  return (
    <div className="space-y-5">

      {/* === BANNER OUTSTANDING === */}
      {countOutstanding > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
          <AlertCircle size={20} className="text-red-500 shrink-0" />
          <div>
            <p className="text-sm font-black text-red-700">
              {countOutstanding} transaksi outstanding — Total {fmtRp(totalOutstanding)}
            </p>
            <p className="text-xs text-red-500 mt-0.5">Klik filter "Outstanding" untuk melihat daftar</p>
          </div>
          <button
            onClick={() => setFilterPayment('outstanding')}
            className="ml-auto px-3 py-1.5 bg-red-500 text-white text-xs font-black rounded-xl hover:bg-red-600 transition-colors shrink-0"
          >
            Lihat Semua
          </button>
        </div>
      )}

      {/* === FILTER & SEARCH === */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari Order ID, Nama, atau No HP..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>
          {/* Filter Tanggal */}
          <div className="relative w-full sm:w-auto min-w-[180px]">
            <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-600"
            />
            {filterDate && (
              <button
                onClick={() => setFilterDate('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] bg-red-100 text-red-600 px-2 py-1 rounded-lg font-bold hover:bg-red-200"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Filter Payment */}
        <div className="flex flex-wrap gap-2">
          {[
            { value: 'all',         label: 'Semua' },
            { value: 'paid',        label: 'Lunas' },
            { value: 'unpaid',      label: 'Belum Bayar' },
            { value: 'outstanding', label: `Outstanding (${countOutstanding})` },
            { value: 'refunded',    label: 'Refund' }
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setFilterPayment(opt.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                filterPayment === opt.value
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* === DAFTAR KARTU === */}
      {data.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center text-slate-500 font-medium">
          Belum ada transaksi di sistem.
        </div>
      ) : filteredData.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center text-slate-500 font-medium">
          Tidak ada pesanan yang cocok dengan filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredData.map((b) => (
            <BookingCard
              key={b.order_id}
              b={b}
              isExpanded={expandedOrderId === b.order_id}
              onToggle={() => toggleExpand(b.order_id)}
              onEdit={handleEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default BookingTable;