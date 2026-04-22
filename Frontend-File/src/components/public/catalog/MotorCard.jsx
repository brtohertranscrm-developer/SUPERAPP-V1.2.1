import React from 'react';
import { Calendar, Users, CloudRain, Settings2, Clock, Flame, BatteryCharging, Zap } from 'lucide-react';

const MotorCard = ({ motor, onClick }) => {
  const publicName = motor.display_name || motor.public_name || motor.name;
  // Ambil harga 24 jam final (dari current_price hasil backend)
  const price24h = motor.current_price || motor.base_price;
  
  // PERBAIKAN: Baca harga 12 jam dari perhitungan backend (current_price_12h) 
  // Jika tidak ada, gunakan price_12h asli, lalu fallback terakhir dengan rumus 0.7
  const price12h = motor.current_price_12h || motor.price_12h || Math.round(price24h * 0.7);
  
  const category = String(motor.category || '');
  const normalizedCc = String(motor.cc || '');
  const isMatic = category.toLowerCase().includes('matic');
  const isManual = category.toLowerCase().includes('manual');
  const isEV = normalizedCc.toLowerCase() === 'listrik' || category.toLowerCase().includes('ev') || category.toLowerCase().includes('listrik');


  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-[2.5rem] p-5 shadow-sm border border-slate-100 flex flex-col group cursor-pointer hover:shadow-2xl hover:shadow-slate-200/50 hover:-translate-y-2 transition-all duration-500"
    >
      {/* GAMBAR MOTOR */}
      <div className="relative h-56 bg-slate-50 rounded-3xl overflow-hidden mb-5">
        <img src={motor.image_url} alt={publicName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-[9px] font-black text-slate-900 uppercase tracking-widest shadow-sm">
          {motor.category}
        </div>
        <div className="absolute bottom-4 left-4 bg-slate-900/75 backdrop-blur-sm px-3 py-1.5 rounded-full text-[9px] font-black text-white uppercase tracking-widest shadow-sm">
          {motor.location || 'Yogyakarta'}
        </div>
        {motor.is_surge && (
          <div className="absolute top-4 right-4 bg-rose-500 text-white px-3 py-1.5 rounded-full text-[9px] font-black uppercase shadow-sm flex items-center gap-1">
            <Flame size={10} /> Hot
          </div>
        )}
        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div className="bg-white text-slate-900 px-4 py-2 rounded-xl font-black text-xs flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
            Pilih Tanggal <Calendar size={14} />
          </div>
        </div>
      </div>

      {/* INFO MOTOR */}
      <div className="flex-1 flex flex-col px-1">
        <h2 className="text-xl font-black text-slate-900 leading-tight mb-4">{publicName}</h2>
        
        {/* LABEL FASILITAS */}
        <div className="flex flex-wrap gap-2 mb-6 mt-auto">
          {/* Badge CC Baru */}
          {normalizedCc && (
            <span className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
              {isEV ? (
                <>
                  <BatteryCharging size={12} className="text-green-500" /> Listrik
                </>
              ) : (
                <>
                  <Zap size={12} className="text-slate-400" /> {normalizedCc} cc
                </>
              )}
            </span>
          )}
          <span className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
            <Users size={12} className="text-slate-400" /> 2 Helm
          </span>
          <span className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
            <CloudRain size={12} className="text-slate-400" /> Jas Hujan
          </span>
          <span className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
            <Settings2 size={12} className="text-slate-400" /> {isMatic ? 'Matic' : isManual ? 'Manual' : 'EV'}
          </span>
        </div>

        {/* BOX HARGA */}
        <div className="pt-5 border-t border-slate-50">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex justify-center items-center gap-1"><Clock size={10}/> 12 Jam</div>
              <div className="font-black text-slate-900 text-sm">Rp {price12h.toLocaleString('id-ID')}</div>
            </div>
            <div className="bg-rose-50 p-3 rounded-2xl border border-rose-100 text-center relative">
              <div className="text-[9px] font-bold text-rose-500 uppercase tracking-widest mb-1 flex justify-center items-center gap-1"><Clock size={10}/> 24 Jam</div>
              <div className="font-black text-rose-500 text-sm">Rp {price24h.toLocaleString('id-ID')}</div>
              
              {/* PERBAIKAN: Gunakan motor.base_price asli untuk memunculkan harga lama (yang dicoret) */}
              {motor.is_surge && (
                <div className="absolute -top-2 -right-1 bg-rose-500 text-white text-[8px] px-2 py-0.5 rounded-full line-through opacity-90 shadow-sm">
                  {motor.base_price.toLocaleString('id-ID')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MotorCard;
