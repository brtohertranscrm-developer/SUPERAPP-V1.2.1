import React from 'react';
import { CarFront } from 'lucide-react';
import { fmtRp } from '../checkoutCarUtils';

export default function DetailStep({ bookingData, computed }) {
  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-2xl font-black truncate">{bookingData?.carName || 'Mobil'}</div>
          <div className="mt-1 text-sm text-slate-500 font-bold">
            Pickup: <span className="text-rose-600">{bookingData?.pickupCity || '-'}</span>
          </div>
          <div className="mt-1 text-xs text-slate-400 font-bold">
            {bookingData?.startDate} → {bookingData?.endDate}
          </div>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shrink-0">
          <CarFront size={22} />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Durasi</div>
          <div className="mt-1 text-lg font-black">{computed?.days || 1} hari</div>
        </div>
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Harga / hari</div>
          <div className="mt-1 text-lg font-black">{fmtRp(computed?.basePricePerDay)}</div>
        </div>
      </div>

      <div className="mt-6 bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex justify-between text-sm font-bold text-slate-600">
          <span>Subtotal</span>
          <span>{fmtRp(computed?.subTotal)}</span>
        </div>
        <div className="flex justify-between text-sm font-bold text-slate-600 mt-2">
          <span>Biaya Admin</span>
          <span>{fmtRp(computed?.serviceFee)}</span>
        </div>
        <div className="h-px bg-slate-100 my-3" />
        <div className="flex justify-between text-base font-black text-slate-900">
          <span>Total (sebelum diskon)</span>
          <span>{fmtRp(computed?.beforeDiscount)}</span>
        </div>
      </div>
    </div>
  );
}

