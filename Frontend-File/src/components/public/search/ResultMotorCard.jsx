import React from 'react';
import { Flame, Settings2, ShieldCheck, CloudRain, Clock, ChevronRight, BatteryCharging, Zap } from 'lucide-react';

const ResultMotorCard = ({ 
  motor, motorCity, totalDays, onRent 
}) => {
  const publicName = motor.display_name || motor.public_name || motor.name;
  const basePrice24h = Number(motor.current_price || motor.base_price || 0);
  const basePrice12h = Number(motor.current_price_12h || motor.price_12h || Math.round(basePrice24h * 0.7));
  
  const categoryStr = String(motor.category || '');
  const normalizedCc = String(motor.cc || '');
  const isMatic = categoryStr.toLowerCase().includes('matic');
  const isEV = normalizedCc.toLowerCase() === 'listrik' || categoryStr.toLowerCase().includes('ev') || categoryStr.toLowerCase().includes('listrik');
  
  const safeImageUrl = motor.image_url || 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=800';

  return (
    <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col lg:flex-row hover:shadow-2xl hover:shadow-slate-200/50 hover:-translate-y-1.5 transition-all duration-500 group relative">
      
      {/* Gambar Kiri */}
      <div className="relative h-64 lg:h-auto lg:w-[35%] bg-slate-100 overflow-hidden shrink-0">
        <img src={safeImageUrl} alt={publicName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent"></div>
        
        <div className="absolute top-5 left-5 flex flex-col gap-2">
          <span className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl text-[10px] font-black text-slate-900 uppercase tracking-widest shadow-sm w-max border border-white">
            {categoryStr || 'Motor'}
          </span>
          {motor.is_surge && (
             <span className="bg-rose-500 text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase shadow-sm flex items-center gap-1 w-max">
               <Flame size={12} fill="white" /> Hot Item
             </span>
          )}
        </div>
        
        <div className="absolute bottom-5 left-5 text-white">
           <div className="text-[11px] font-bold flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-2 rounded-xl border border-white/10 shadow-inner">
             <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-xl shadow-green-500/50"></span>
             Tersedia {motor.stock || 0} Unit di {motorCity}
           </div>
        </div>
      </div>

      {/* Info Tengah */}
      <div className="flex-1 p-6 lg:p-8 flex flex-col justify-center bg-white relative z-10 border-r border-slate-100/50">
        <h3 className="text-2xl lg:text-3xl font-black text-slate-900 mb-4 tracking-tight group-hover:text-rose-500 transition-colors duration-300">{publicName}</h3>
        
        <div className="flex flex-wrap gap-2 mb-6">
          {/* Badge CC (Hanya muncul jika bukan listrik dan datanya ada) */}
          {normalizedCc && !isEV && (
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 bg-slate-50 px-3 py-2.5 rounded-xl border border-slate-100 shadow-inner">
              <Zap size={16} className="text-yellow-500" /> {normalizedCc} cc
            </span>
          )}
          {isEV && (
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-green-700 bg-green-50 px-3 py-2.5 rounded-xl border border-green-100 shadow-inner">
              <BatteryCharging size={16} className="text-green-500" /> Motor Listrik
            </span>
          )}

          {/* 3. PERBAIKAN BADGE TRANSMISI/EV: Icon dan teks akan menyesuaikan secara dinamis */}
          <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 bg-slate-50 px-3 py-2.5 rounded-xl border border-slate-100 shadow-inner">
            {isEV ? (
              <BatteryCharging size={16} className="text-green-500" />
            ) : (
              <Settings2 size={16} className="text-rose-500" />
            )}
            {isEV ? 'Motor Listrik' : isMatic ? 'Transmisi Matic' : 'Transmisi Manual'}
          </span>

          <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 bg-slate-50 px-3 py-2.5 rounded-xl border border-slate-100 shadow-inner">
            <ShieldCheck size={16} className="text-green-500" /> 2 Helm SNI
          </span>
          <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 bg-slate-50 px-3 py-2.5 rounded-xl border border-slate-100 shadow-inner">
            <CloudRain size={16} className="text-blue-500" /> Jas Hujan
          </span>
        </div>
        
        <p className="text-sm font-medium text-slate-500 leading-relaxed max-w-lg hidden sm:block">
          Armada dirawat standar dealer resmi, bersih, dan prima. Serta layanan Roadside Assistance 24/7.
        </p>
      </div>

      {/* Harga & Tombol Kanan */}
      <div className="lg:w-80 bg-slate-50 border-t lg:border-t-0 lg:border-l border-slate-100 p-6 lg:p-8 flex flex-col justify-between shrink-0 relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-2xl pointer-events-none"></div>
        <div>
          <div className="grid grid-cols-2 gap-3 mb-6 relative z-10">
            <div className="bg-white border border-slate-200 rounded-2xl p-3 text-center">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center justify-center gap-1"><Clock size={11} />12 Jam</div>
              <div className="font-black text-slate-800 text-sm">Rp {basePrice12h.toLocaleString('id-ID')}</div>
            </div>
            <div className="bg-white border border-rose-100 rounded-2xl p-3 text-center">
              <div className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1 flex items-center justify-center gap-1"><Clock size={11} />24 Jam</div>
              <div className="font-black text-rose-500 text-sm">Rp {basePrice24h.toLocaleString('id-ID')}</div>
            </div>
          </div>
          
          <div className="text-right mb-8 relative z-10">
            <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1.5">
              Booking Fleksibel
            </div>
            <div className="text-base font-black text-slate-900 tracking-tight drop-shadow-sm">12 jam / 24 jam dihitung otomatis per tanggal</div>
            <div className="text-xs text-slate-500 font-medium mt-1">Estimasi hari kalender: {totalDays} hari</div>
            {motor.is_surge && (
              <div className="text-[10px] font-bold text-rose-500 mt-1 uppercase tracking-widest flex items-center justify-end gap-1.5">
                <Flame size={12}/> High Demand / Liburan
              </div>
            )}
          </div>
        </div>
        
        <button onClick={() => onRent(motor)} className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-rose-500 transition-all duration-300 flex items-center justify-center gap-2.5 shadow-xl shadow-slate-900/10 active:scale-95 group-hover:shadow-rose-500/20 hover:-translate-y-0.5 relative z-10">
          Pesan Armada Ini <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform"/>
        </button>
      </div>

    </div>
  );
};

export default ResultMotorCard;
