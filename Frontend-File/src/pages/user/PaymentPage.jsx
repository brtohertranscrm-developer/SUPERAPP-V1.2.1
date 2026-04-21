import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Loader2 } from 'lucide-react';
import { usePayment } from '../../hooks/usePayment';

export default function PaymentPage() {
  const navigate = useNavigate();
  const {
    user,
    orderData,
    paymentInfo,
    isLoading,
  } = usePayment();

  if (!user) return null;

  // ==========================================
  // HALAMAN INSTRUKSI TRANSFER (LOKER)
  // ==========================================
  return (
    <div className="py-12 bg-brand-light min-h-screen animate-fade-in-up">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-rose-900/5 border border-gray-100 overflow-hidden">
          <div className="p-8 sm:p-10">
            <h1 className="text-2xl sm:text-3xl font-black text-brand-dark mb-2 tracking-tight flex items-center gap-2">
              <CreditCard size={22} className="text-brand-primary" /> Instruksi Transfer Bank
            </h1>
            <p className="text-gray-500 text-sm font-medium">
              Untuk saat ini pembayaran masih via transfer bank dan diverifikasi manual oleh admin.
            </p>

            {isLoading && (
              <div className="mt-8 flex items-center gap-2 text-gray-500 font-bold">
                <Loader2 size={16} className="animate-spin text-brand-primary" /> Memuat data pembayaran...
              </div>
            )}

            {!isLoading && !orderData && (
              <div className="mt-8 text-sm font-bold text-rose-600">
                Data pesanan tidak ditemukan.
              </div>
            )}

            {!isLoading && orderData && (
              <div className="mt-8 space-y-4">
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5">
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Order ID</div>
                  <div className="font-mono font-black text-brand-dark">{orderData.order_id}</div>
                  <div className="mt-3 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Tagihan</div>
                  <div className="text-2xl font-black text-brand-dark">
                    Rp {Number(orderData.total_price || 0).toLocaleString('id-ID')}
                  </div>
                  <div className="mt-1 text-xs text-gray-500 font-bold">{orderData.item_name}</div>
                </div>

                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5">
                  <div className="text-sm font-black text-brand-dark mb-2">Rekening Tujuan</div>
                  <div className="space-y-2 text-sm font-bold text-gray-700">
                    <div>
                      <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">BCA</div>
                      <div>{paymentInfo?.bca?.number ? `${paymentInfo.bca.number} (a/n ${paymentInfo.bca.name || '-'})` : 'Belum diset'}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mandiri</div>
                      <div>{paymentInfo?.mandiri?.number ? `${paymentInfo.mandiri.number} (a/n ${paymentInfo.mandiri.name || '-'})` : 'Belum diset'}</div>
                    </div>
                  </div>
                  <div className="mt-3 text-[11px] font-bold text-gray-400">
                    Setelah transfer, status akan berubah setelah diverifikasi admin.
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard', { replace: true })}
                    className="flex-1 py-3.5 rounded-2xl bg-brand-dark text-white font-black hover:bg-slate-800 transition-colors"
                  >
                    Ke Dashboard
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/trip-history', { replace: true })}
                    className="flex-1 py-3.5 rounded-2xl bg-gray-100 text-gray-700 font-black hover:bg-gray-200 transition-colors"
                  >
                    Lihat Riwayat
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
