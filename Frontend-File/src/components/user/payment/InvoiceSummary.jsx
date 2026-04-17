import React from 'react';
import { Clock } from 'lucide-react';

const InvoiceSummary = ({ orderData }) => {
  return (
    <>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-black text-brand-dark mb-2 tracking-tight">Selesaikan Pembayaran</h1>
        <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-100 text-orange-600 px-4 py-2 rounded-full text-sm font-bold shadow-sm">
          <Clock size={16} /> Sisa Waktu: 14:59
        </div>
      </div>

      {/* Box Gelap Total Tagihan */}
      <div className="bg-brand-dark p-8 sm:p-10 text-center text-white relative overflow-hidden">
        <div className="relative z-10">
          <div className="text-rose-300 text-[10px] font-black uppercase tracking-widest mb-2">{orderData.item_name} ({orderData.display_duration})</div>
          <div className="text-4xl sm:text-5xl font-black mb-4 tracking-tight drop-shadow-md">Rp {orderData.total_price.toLocaleString('id-ID')}</div>
          <div className="bg-white/10 border border-white/20 px-4 py-1.5 rounded-full inline-flex text-white/80 text-xs font-bold tracking-wider font-mono shadow-inner">
            {orderData.order_id}
          </div>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/20 rounded-full blur-[80px] -mr-20 -mt-20 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-blue-500/20 rounded-full blur-[60px] -ml-10 -mb-10 pointer-events-none"></div>
      </div>
    </>
  );
};

export default InvoiceSummary;