import React from 'react';
import { CreditCard, ShieldCheck, Loader2 } from 'lucide-react';

const PaymentMethods = ({ 
  paymentMethod, setPaymentMethod, 
  isProcessing, handlePayment 
}) => {
  return (
    <form onSubmit={handlePayment} className="p-6 sm:p-10">
      <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4 border-b border-dashed border-gray-200 pb-3">Konfirmasi Transfer</h3>
      
      <div className="space-y-3 mb-8">
        <label className={`flex items-center justify-between p-4 border-2 rounded-2xl cursor-pointer transition-all ${paymentMethod === 'bank_bca' ? 'border-brand-primary bg-rose-50/30' : 'border-gray-100 hover:border-brand-primary/50 bg-white'}`}>
          <div className="flex items-center gap-4">
            <input type="radio" name="payment" checked={paymentMethod === 'bank_bca'} onChange={() => setPaymentMethod('bank_bca')} className="w-5 h-5 text-brand-primary focus:ring-brand-primary" />
            <div>
              <div className="font-bold text-brand-dark text-sm sm:text-base">Transfer Bank (BCA)</div>
              <div className="text-xs font-medium text-gray-500">Konfirmasi manual oleh admin</div>
            </div>
          </div>
          <div className="w-12 h-8 bg-white border border-gray-100 rounded flex items-center justify-center shrink-0 shadow-sm"><CreditCard size={20} className="text-blue-600" /></div>
        </label>
      </div>

      <button 
        type="submit"
        disabled={isProcessing}
        className="w-full py-4 bg-brand-primary text-white font-black rounded-2xl hover:bg-brand-secondary transition-all shadow-xl shadow-rose-500/20 flex items-center justify-center gap-2 disabled:bg-brand-primary/60 disabled:cursor-not-allowed active:scale-95"
      >
        {isProcessing ? (
          <><Loader2 size={20} className="animate-spin" /> Mengirim Konfirmasi...</>
        ) : (
          <><ShieldCheck size={20} /> Saya Sudah Transfer</>
        )}
      </button>
      <div className="text-center text-[11px] font-bold text-gray-400 mt-5 flex items-center justify-center gap-1.5">
        <ShieldCheck size={14} className="text-green-500" /> Bukti transfer akan diverifikasi manual oleh admin
      </div>
    </form>
  );
};

export default PaymentMethods;
