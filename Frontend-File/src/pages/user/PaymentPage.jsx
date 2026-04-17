import React from 'react';
import { CheckCircle, Loader2 } from 'lucide-react';
import { usePayment } from '../../hooks/usePayment';
import InvoiceSummary from '../../components/user/payment/InvoiceSummary';
import PaymentMethods from '../../components/user/payment/PaymentMethods';

export default function PaymentPage() {
  const {
    user, orderData,
    paymentMethod, setPaymentMethod,
    isProcessing, isSuccess,
    handlePayment
  } = usePayment();

  if (!orderData || !user) return null;

  // ==========================================
  // TAMPILAN JIKA PEMBAYARAN SUKSES
  // ==========================================
  if (isSuccess) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-brand-light px-4 animate-fade-in-up">
        <div className="bg-white p-10 rounded-[2rem] shadow-xl shadow-green-900/5 w-full max-w-md border border-gray-100 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-green-500"></div>
          <div className="w-24 h-24 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 scale-in-center">
            <CheckCircle size={48} />
          </div>
          <h2 className="text-2xl font-black text-brand-dark mb-2">Pembayaran Berhasil!</h2>
          <p className="text-gray-500 mb-6 leading-relaxed font-medium">
            Terima kasih, pesanan <span className="font-bold text-brand-dark">{orderData.item_name}</span> Anda telah dikonfirmasi.
          </p>
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-8 inline-block">
            <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Order ID</span>
            <span className="font-mono font-black text-brand-dark">{orderData.order_id}</span>
          </div>
          <div className="text-sm font-bold text-gray-400 flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin text-brand-primary" /> Mengarahkan ke Riwayat...
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // TAMPILAN HALAMAN PEMBAYARAN
  // ==========================================
  return (
    <div className="py-12 bg-brand-light min-h-screen animate-fade-in-up">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-rose-900/5 border border-gray-100 overflow-hidden">
          
          <InvoiceSummary orderData={orderData} />

          <PaymentMethods 
            paymentMethod={paymentMethod}
            setPaymentMethod={setPaymentMethod}
            isProcessing={isProcessing}
            handlePayment={handlePayment}
          />

        </div>
      </div>
    </div>
  );
}