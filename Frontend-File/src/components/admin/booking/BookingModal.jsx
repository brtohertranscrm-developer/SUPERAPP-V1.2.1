import React, { useState, useEffect, useMemo } from 'react';
import { X, User, FileText, CreditCard } from 'lucide-react';
import BookingPricePanel from './BookingPricePanel';

const fmtRp  = (n) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const TABS = [
  { key: 'info',    label: 'Info Pesanan',   icon: User },
  { key: 'harga',   label: 'Rincian Harga',  icon: FileText },
  { key: 'status',  label: 'Update Status',  icon: CreditCard }
];

const BookingModal = ({ onClose, onSubmit, onSavePricing, initialData }) => {
  const [activeTab, setActiveTab] = useState('info');
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    status: 'pending',
    payment_status: 'unpaid'
  });

  // Sinkronkan form saat data awal masuk
  useEffect(() => {
    if (initialData) {
      setFormData({
        status:         initialData.status         || 'pending',
        payment_status: initialData.payment_status || 'unpaid'
      });
    }
  }, [initialData]);

  // Kalkulasi finansial secara dinamis untuk menghindari angka 0 jika backend tidak mengirim total
  const financials = useMemo(() => {
    if (!initialData) return { total: 0, paid: 0, outstanding: 0 };
    
    // Hitung total dari breakdown jika total_price tidak ada/nol
    const total = initialData.total_price || (
      (initialData.base_price || 0) +
      (initialData.service_fee || 0) +
      (initialData.extend_fee || 0) +
      (initialData.addon_fee || 0) +
      (initialData.delivery_fee || 0) -
      (initialData.discount_amount || 0)
    );
    
    const paid = initialData.paid_amount || 0;
    
    // Gunakan outstanding dari server, jika tidak ada hitung (Total - Bayar)
    const outstanding = initialData.outstanding_amount !== undefined 
      ? initialData.outstanding_amount 
      : Math.max(0, total - paid);

    return { total, paid, outstanding };
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleStatusSubmit = (e) => {
    e.preventDefault();
    onSubmit(initialData.order_id, formData);
    onClose();
  };

  const handleSavePricing = async (pricingPayload) => {
    setIsSaving(true);
    await onSavePricing(initialData.order_id, pricingPayload);
    setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[92vh] flex flex-col">

        {/* ===== HEADER ===== */}
        <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-3 shrink-0">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Order ID</p>
            <h2 className="text-lg font-black text-slate-800 font-mono">{initialData?.order_id}</h2>
            <p className="text-sm text-slate-500 mt-0.5">{initialData?.user_name} · {initialData?.item_name}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {financials.outstanding > 0 ? (
              <span className="px-2.5 py-1 bg-red-50 text-red-600 border border-red-200 text-[10px] font-black rounded-lg uppercase">
                Outstanding {fmtRp(financials.outstanding)}
              </span>
            ) : (
              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 border border-emerald-200 text-[10px] font-black rounded-lg uppercase">
                Lunas
              </span>
            )}
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-rose-500 rounded-xl hover:bg-rose-50 transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ===== TAB NAVIGASI ===== */}
        <div className="px-5 pt-4 flex gap-1 shrink-0">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>

        {/* ===== KONTEN TAB ===== */}
        <div className="flex-1 overflow-y-auto p-5">

          {/* ---- TAB 1: INFO PESANAN ---- */}
          {activeTab === 'info' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Pelanggan',    value: initialData?.user_name },
                  { label: 'No. HP',       value: initialData?.user_phone },
                  { label: 'Item',         value: initialData?.item_name },
                  { label: 'Tipe',         value: initialData?.item_type?.toUpperCase() },
                  { label: 'Lokasi',       value: initialData?.location || '—' },
                  { label: 'Plat/Unit',    value: initialData?.plate_number || '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                    <p className="text-sm font-bold text-slate-800 truncate">{value || '—'}</p>
                  </div>
                ))}
              </div>

              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Durasi Sewa</p>
                <div className="flex items-center justify-center gap-3 text-sm">
                  <span className="font-bold text-slate-800">{fmtDate(initialData?.start_date)}</span>
                  <span className="text-slate-300">→</span>
                  <span className="font-bold text-slate-800">{fmtDate(initialData?.end_date)}</span>
                </div>
              </div>

              {/* Ringkasan Keuangan menggunakan data hasil kalkulasi */}
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3">Ringkasan Keuangan</p>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Total tagihan</span>
                    <span className="font-bold text-slate-800">{fmtRp(financials.total)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Sudah dibayar</span>
                    <span className="font-bold text-emerald-700">{fmtRp(financials.paid)}</span>
                  </div>
                  <div className={`flex justify-between text-sm border-t border-blue-200 pt-1.5 mt-1.5 ${financials.outstanding > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    <span className="font-black">Outstanding</span>
                    <span className="font-black">{fmtRp(financials.outstanding)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ---- TAB 2: RINCIAN HARGA ---- */}
          {activeTab === 'harga' && (
            <BookingPricePanel
              booking={initialData}
              onSavePricing={handleSavePricing}
              isSaving={isSaving}
            />
          )}

          {/* ---- TAB 3: UPDATE STATUS ---- */}
          {activeTab === 'status' && (
            <form onSubmit={handleStatusSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">Status Pembayaran</label>
                <select
                  name="payment_status"
                  value={formData.payment_status}
                  onChange={handleChange}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                >
                  <option value="unpaid">Unpaid — Belum lunas</option>
                  <option value="paid">Paid — Lunas</option>
                  <option value="refunded">Refunded — Dana dikembalikan</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">Status Booking</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                >
                  <option value="pending">Pending — Menunggu konfirmasi</option>
                  <option value="active">Active — Sedang berjalan</option>
                  <option value="completed">Completed — Selesai</option>
                  <option value="cancelled">Cancelled — Dibatalkan</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 shadow-md transition-colors text-sm"
              >
                Simpan Perubahan Status
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingModal;