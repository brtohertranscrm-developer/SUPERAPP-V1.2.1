import React from 'react';
import { Bike, MapPin, Calendar, Loader2, CheckCircle2 } from 'lucide-react';

const OrderSummary = ({ 
  bookingData, subTotal, adminFee, grandTotal, 
  isLoading, handleCheckout 
}) => {
  return (
    <div className="w-full lg:w-1/3">
      <div className="bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden sticky top-28">
        
        {/* Header Summary */}
        <div className="bg-slate-900 p-6 sm:p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10"></div>
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Ringkasan Sewa</h3>
          <h2 className="text-2xl font-black flex items-center gap-2"><Bike size={24} className="text-rose-500"/> {bookingData.motorName}</h2>
        </div>
        
        <div className="p-6 sm:p-8">
          {/* Jadwal & Lokasi */}
          <div className="space-y-4 mb-6 pb-6 border-b border-dashed border-slate-200">
            <div className="flex items-start gap-3">
              <MapPin className="text-rose-500 shrink-0 mt-0.5" size={18}/>
              <div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Titik Jemput & Kembali</div>
                <div className="font-bold text-slate-900">{bookingData.pickupLocation}</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar className="text-rose-500 shrink-0 mt-0.5" size={18}/>
              <div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Jadwal Sewa ({bookingData.totalDays} Hari)</div>
                <div className="font-bold text-slate-900">{bookingData.startDate} <span className="text-slate-400 font-normal mx-1">s/d</span> {bookingData.endDate}</div>
              </div>
            </div>
          </div>

          {/* Rincian Biaya */}
          <div className="space-y-3 mb-6 pb-6 border-b border-slate-100">
            <div className="flex justify-between text-sm font-bold text-slate-500">
              <span>Biaya Sewa ({bookingData.totalDays}x Rp {bookingData.basePrice.toLocaleString('id-ID')})</span>
              <span className="text-slate-900">Rp {subTotal.toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-slate-500">
              <span>Biaya Layanan & Aplikasi</span>
              <span className="text-slate-900">Rp {adminFee.toLocaleString('id-ID')}</span>
            </div>
          </div>

          {/* Total */}
          <div className="flex justify-between items-end mb-8">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Total Pembayaran</span>
            <span className="text-3xl font-black text-rose-500 tracking-tight">Rp {grandTotal.toLocaleString('id-ID')}</span>
          </div>

          <button 
            onClick={handleCheckout} 
            disabled={isLoading}
            className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-rose-500 transition-all shadow-xl shadow-slate-900/10 active:scale-95 flex items-center justify-center gap-2 group"
          >
            {isLoading ? <Loader2 className="animate-spin" size={20}/> : <><CheckCircle2 size={20} className="group-hover:scale-110 transition-transform"/> Bayar Sekarang</>}
          </button>
          <p className="text-center text-[10px] font-bold text-slate-400 mt-4 px-4">
            Dengan menekan tombol bayar, Anda menyetujui Syarat & Ketentuan Brother Trans.
          </p>
        </div>

      </div>
    </div>
  );
};

export default OrderSummary;
