import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Flame, Clock, Users, CloudRain, Settings2, ArrowRight, ShieldCheck } from 'lucide-react';

const SearchResultList = ({ motors, handleRent, pickupLocation }) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-4">
      {motors.map((motor, index) => {
        
        // Tampilkan Iklan Loker setelah index ke-1
        const showLockerAds = index === 1;

        const isOutofStock = motor.stock <= 0;
        const isLowStock = motor.stock > 0 && motor.stock <= 2;
        const price24h = motor.current_price || motor.base_price;
        const price12h = motor.current_price_12h || motor.price_12h || Math.round(price24h * 0.7);
        const isMatic = motor.category.toLowerCase().includes('matic');

        return (
          <React.Fragment key={motor.id}>
            
            {/* KARTU MOTOR */}
            <div className={`bg-white rounded-3xl p-4 sm:p-5 shadow-sm border border-slate-100 flex flex-col sm:flex-row gap-5 group transition-all duration-300 ${isOutofStock ? 'opacity-50 grayscale' : 'hover:shadow-xl hover:shadow-slate-200/50 hover:border-rose-100'}`}>
              
              {/* Gambar Kecil */}
              <div className="relative w-full sm:w-48 h-40 sm:h-36 bg-slate-50 rounded-2xl overflow-hidden shrink-0">
                <img src={motor.image_url} alt={motor.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-[8px] font-black text-slate-900 uppercase tracking-widest shadow-sm">
                  {motor.category}
                </div>
                {motor.is_surge && (
                  <div className="absolute top-2 right-2 bg-rose-500 text-white px-2 py-1 rounded-md text-[8px] font-black uppercase flex items-center gap-1 shadow-sm">
                    <Flame size={10} /> Hot
                  </div>
                )}
              </div>

              {/* Info Tengah */}
              <div className="flex-1 flex flex-col justify-center">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">{motor.name}</h3>
                  {isOutofStock ? (
                    <span className="bg-slate-100 text-slate-500 px-2.5 py-1 rounded-md text-[10px] font-black uppercase">Habis</span>
                  ) : (
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase flex items-center gap-1 ${isLowStock ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-700'}`}>
                      <Zap size={12} /> {isLowStock ? `Sisa ${motor.stock} unit` : `Tersedia ${motor.stock} unit`}
                    </span>
                  )}
                </div>
                
                {/* Grid Fasilitas Icon */}
                <div className="flex flex-wrap gap-2 mb-2 sm:mb-0 mt-auto">
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100"><Users size={14} className="text-slate-400" /> 2 Helm</span>
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100"><CloudRain size={14} className="text-slate-400" /> Jas Hujan</span>
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100"><Settings2 size={14} className="text-slate-400" /> {isMatic ? 'Matic' : 'Manual'}</span>
                </div>
              </div>

              {/* Harga Kanan */}
              <div className="sm:w-56 shrink-0 flex flex-col justify-between border-t sm:border-t-0 sm:border-l border-slate-100 pt-4 sm:pt-0 sm:pl-5">
                <div className="grid grid-cols-2 sm:grid-cols-1 gap-2 mb-4 sm:mb-0">
                  <div className="flex justify-between items-center sm:block">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1"><Clock size={10}/> 12 Jam</div>
                    <div className="font-black text-slate-700 text-sm">Rp {price12h.toLocaleString('id-ID')}</div>
                  </div>
                  <div className="flex justify-between items-center sm:block">
                    <div className="text-[10px] font-bold text-rose-500 uppercase tracking-widest flex items-center gap-1"><Clock size={10}/> 24 Jam</div>
                    <div className="font-black text-rose-500 text-base">
                      Rp {price24h.toLocaleString('id-ID')}
                      {motor.is_surge && <span className="block text-[9px] text-slate-400 line-through font-normal leading-none mt-0.5">Rp {motor.base_price.toLocaleString('id-ID')}</span>}
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 font-bold mb-4">
                  Billing 12 jam / 24 jam akan dihitung otomatis sesuai tanggal dan jam booking.
                </p>

                {isOutofStock ? (
                  <button disabled className="w-full bg-slate-100 text-slate-400 font-bold py-3 rounded-xl text-sm cursor-not-allowed">
                    Kosong
                  </button>
                ) : (
                  <button 
                    onClick={() => handleRent(motor)}
                    className="w-full bg-slate-900 text-white font-black py-3 rounded-xl text-sm hover:bg-rose-500 transition-colors flex justify-center items-center gap-2 active:scale-95"
                  >
                    Pilih <ArrowRight size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* IKLAN LOKER (TAMPIL SETELAH MOTOR KEDUA) */}
            {showLockerAds && (
              <div className="my-6 relative overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 text-white border border-white/5 shadow-2xl">
                <div className="absolute top-0 right-0 w-40 h-40 bg-rose-500 rounded-full blur-[80px] opacity-20 -mr-10 -mt-10"></div>
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-5">
                    <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/10 shrink-0">
                      <ShieldCheck size={32} className="text-rose-500" />
                    </div>
                    <div>
                      <h4 className="text-xl font-black leading-tight mb-1">Bawa Koper / Tas Besar?</h4>
                      <p className="text-slate-400 text-xs font-medium">Titipkan aman di Smart Loker {pickupLocation}. Cuma 10rb/jam!</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => navigate('/loker')}
                    className="w-full md:w-auto px-6 py-3 bg-white text-slate-900 font-black rounded-xl text-xs hover:bg-rose-500 hover:text-white transition-all shadow-xl"
                  >
                    SEWA LOKER JUGA
                  </button>
                </div>
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default SearchResultList;
