import React from 'react';
import { Bike, MapPin, AlertTriangle, QrCode, CalendarPlus } from 'lucide-react';

const ActiveBookingCard = ({ order, activeOrder, navigate, handleExtend }) => {
  // Menangkap data entah dari prop 'order' (Dashboard) atau 'activeOrder'
  const data = activeOrder || order; 
  
  if (!data) return null;

  return (
    <div className="relative w-full mx-auto mb-10 drop-shadow-2xl animate-fade-in-up">
      {/* Kontainer Utama Tiket */}
      <div className="flex flex-col md:flex-row bg-slate-900 rounded-[2rem] overflow-hidden">
        
        {/* BAGIAN KIRI: INFO UTAMA TIKET */}
        <div className="flex-1 p-6 sm:p-8 relative text-white">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
          
          <div className="flex justify-between items-start mb-8 relative z-10">
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-1">E-Ticket / Order ID</span>
              <span className="font-mono font-black text-2xl sm:text-3xl tracking-wider text-rose-500">{data.id}</span>
            </div>
            <span className="text-[10px] font-black bg-rose-500 text-white px-3 py-1.5 rounded-full flex items-center gap-1.5 uppercase shadow-lg shadow-rose-500/30">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span> {data.status}
            </span>
          </div>

          <div className="flex items-center gap-5 mb-8 relative z-10">
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/10 shrink-0">
              <Bike size={32} className="text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-black leading-tight mb-1">{data.item}</h3>
              <p className="text-slate-300 text-xs sm:text-sm font-medium flex items-center gap-1.5">
                <MapPin size={14} className="text-rose-500" /> {data.location || 'Lokasi belum diset'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 bg-white/5 p-5 rounded-2xl border border-white/10 relative z-10">
            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Pick-up (Ambil)</span>
              <span className="font-bold text-white text-xs sm:text-sm">{data.startDate}</span>
            </div>
            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Drop-off (Kembali)</span>
              <span className="font-bold text-white text-xs sm:text-sm">{data.endDate}</span>
            </div>
          </div>
        </div>

        {/* PEMBATAS TIKET & LUBANG */}
        <div className="hidden md:flex flex-col items-center justify-between bg-slate-900 relative w-8">
          <div className="w-8 h-8 bg-slate-50 rounded-full -mt-4 absolute z-10"></div>
          <div className="h-full border-l-2 border-dashed border-white/20 absolute left-1/2 -translate-x-1/2"></div>
          <div className="w-8 h-8 bg-slate-50 rounded-full -mb-4 absolute bottom-0 z-10"></div>
        </div>
        <div className="md:hidden flex items-center justify-between bg-slate-900 relative h-8 w-full">
          <div className="w-8 h-8 bg-slate-50 rounded-full -ml-4 absolute z-10"></div>
          <div className="w-full border-t-2 border-dashed border-white/20 absolute top-1/2 -translate-y-1/2"></div>
          <div className="w-8 h-8 bg-slate-50 rounded-full -mr-4 absolute right-0 z-10"></div>
        </div>

        {/* BAGIAN KANAN: QR CODE & TOMBOL AKSI */}
        <div className="md:w-72 bg-slate-900 p-6 sm:p-8 flex flex-col items-center justify-center relative">
          
          <div className="bg-white p-4 rounded-3xl shadow-xl mb-6 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-0.5 bg-rose-500 shadow-[0_0_15px_3px_rgba(244,63,94,0.6)] animate-[bounce_2s_infinite] z-10"></div>
            <QrCode size={120} strokeWidth={1.2} className="text-slate-900 relative z-0" />
          </div>
          
          <h4 className="text-sm font-black text-white uppercase tracking-widest mb-2 text-center">Scan To Ride</h4>
          <p className="text-[10px] font-medium text-slate-400 leading-relaxed text-center max-w-[180px]">
            Tunjukkan e-ticket ini ke Admin Lapangan saat pengambilan unit.
          </p>

          <div className="mt-8 pt-4 border-t border-white/10 w-full flex items-center justify-between gap-3">
             <button onClick={() => navigate('/support')} className="text-[10px] font-black text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors uppercase tracking-widest flex-1 justify-center group">
              <AlertTriangle size={14} className="text-rose-500 group-hover:scale-110 transition-transform" /> Darurat
            </button>
            <div className="w-px h-6 bg-white/10"></div>
             {/* Tambahan handleExtend && agar tidak error jika props ini lupa dikirim */}
             <button onClick={() => handleExtend && handleExtend(data.id)} className="text-[10px] font-black text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors uppercase tracking-widest flex-1 justify-center group">
              <CalendarPlus size={14} className="text-blue-400 group-hover:scale-110 transition-transform" /> Extend
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};

export default ActiveBookingCard;