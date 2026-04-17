import React from 'react';
import { Bike, Package, CheckCircle2, MapPin, Calendar, ChevronRight } from 'lucide-react';

const TripCard = ({ trip, onOpenTicket }) => {
  const isMotor = trip.item_type === 'motor';

  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 hover:border-brand-primary/30 transition-all duration-300 group">
      <div className="p-6 sm:p-8">
        
        {/* Header Kartu: Ikon, Order ID, Status */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className={`p-4 rounded-2xl flex items-center justify-center ${isMotor ? 'bg-rose-50 text-brand-primary' : 'bg-blue-50 text-blue-600'}`}>
              {isMotor ? <Bike size={28} /> : <Package size={28} />}
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-0.5">Order ID</div>
              <div className="font-mono text-sm font-bold text-brand-dark bg-gray-50 px-2 py-0.5 rounded border border-gray-200">{trip.order_id}</div>
            </div>
          </div>
          <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-sm ${
            trip.status === 'active' || trip.status === 'Aktif' ? 'bg-green-500 text-white' : 
            trip.status === 'completed' ? 'bg-slate-800 text-white' : 'bg-gray-100 text-gray-500'
          }`}>
            <CheckCircle2 size={14} /> {trip.status}
          </div>
        </div>

        {/* Info Lokasi & Jadwal */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6 bg-gray-50 p-4 rounded-2xl border border-gray-100">
          <div>
            <h3 className="text-xl font-black text-brand-dark mb-2 group-hover:text-brand-primary transition-colors">{trip.item_name}</h3>
            <div className="flex items-center gap-2 text-gray-500 text-xs font-bold">
              <MapPin size={16} className={isMotor ? 'text-brand-primary' : 'text-blue-500'} /> 
              {trip.location || 'Garasi Pusat Brother Trans'}
            </div>
          </div>
          <div className="flex flex-col justify-center sm:items-end gap-1">
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
              <Calendar size={12} /> Jadwal Sewa
            </div>
            <div className="text-sm font-bold text-brand-dark bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">
              {trip.start_date} <span className="text-gray-300 mx-1">s/d</span> {trip.end_date}
            </div>
          </div>
        </div>

        {/* Harga & Tombol E-Tiket */}
        <div className="pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-dashed border-gray-200">
          <div>
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Pembayaran</div>
            <div className="text-2xl font-black text-brand-dark tracking-tight">Rp {trip.total_price.toLocaleString('id-ID')}</div>
          </div>
          <button 
            onClick={() => onOpenTicket(trip)}
            className="flex items-center gap-2 text-sm font-black text-brand-primary bg-rose-50 px-5 py-3 rounded-xl hover:bg-rose-500 hover:text-white transition-all shadow-sm active:scale-95"
          >
            Lihat E-Tiket <ChevronRight size={18} />
          </button>
        </div>

      </div>
    </div>
  );
};

export default TripCard;