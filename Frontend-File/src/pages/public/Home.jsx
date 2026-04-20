import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Loader2, Star, Package, CheckCircle2 } from 'lucide-react';
import { useHomeData } from '../../hooks/useHomeData';
import HeroSection from '../../components/public/home/HeroSection';
import PromoSection from '../../components/public/home/PromoSection';
import HowItWorks from '../../components/public/home/HowItWorks';

export default function Home() {
  const navigate = useNavigate();
  const { promotions, featuredMotors, isLoadingMotors } = useHomeData();

  return (
    <div className="font-sans text-slate-900 bg-slate-50 min-h-screen relative overflow-x-hidden">
      
      {/* 1. Hero & Search */}
      <HeroSection />

      {/* 2. Banner Promo Dinamis */}
      <PromoSection promotions={promotions} />

      {/* 3. Benefit / How it works */}
      <HowItWorks />

      {/* 4. Motor Pilihan */}
      <div className="max-w-6xl mx-auto px-4 pb-20 relative z-20">
        <div className="flex justify-between items-end mb-10">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Armada Pilihan Minggu Ini</h2>
            <p className="text-slate-500 font-medium text-sm sm:text-base">Unit paling sering disewa bulan ini. Stok cepat habis!</p>
          </div>
          <button onClick={() => navigate('/motor')} className="hidden sm:flex items-center gap-2 text-sm font-black text-rose-500 hover:text-slate-900 transition-colors">
            Lihat Semua <ChevronRight size={18}/>
          </button>
        </div>

        {isLoadingMotors ? (
          <div className="flex flex-col items-center justify-center py-12"><Loader2 className="animate-spin text-rose-500 mb-3" size={32} /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {featuredMotors.map((motor) => (
              <div key={motor.id} className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden group transition-all hover:shadow-xl">
                <div className="h-56 bg-slate-100 overflow-hidden relative">
                  <img src={motor.image_url} alt={motor.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">
                    {motor.category}
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-black mb-2 text-slate-900">{motor.name}</h3>
                  <div className="flex items-center gap-1 text-amber-400 mb-6 text-sm font-bold">
                    <Star size={16} fill="currentColor" /> 4.9 <span className="text-slate-400 ml-1 font-medium">(120+ Sewa)</span>
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                    <div>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Harga Mulai</div>
                      <div className="text-xl font-black text-rose-500">Rp {motor.base_price.toLocaleString('id-ID')}<span className="text-xs text-slate-400 font-normal">/hari</span></div>
                    </div>
                    <button onClick={() => navigate('/motor')} className="w-12 h-12 bg-slate-50 text-slate-900 rounded-full flex items-center justify-center hover:bg-rose-500 hover:text-white transition-colors">
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <button onClick={() => navigate('/motor')} className="sm:hidden w-full mt-6 py-4 bg-white border border-slate-200 text-slate-900 font-black rounded-2xl flex items-center justify-center gap-2">
          Lihat Semua Motor <ChevronRight size={18}/>
        </button>
      </div>

      {/* 5. Loker CTA */}
      <div className="max-w-6xl mx-auto px-4 pb-24 relative z-10">
        <div className="bg-gradient-to-br from-indigo-600 via-blue-700 to-indigo-800 rounded-[3rem] p-8 sm:p-12 relative overflow-hidden shadow-2xl shadow-blue-900/30 flex flex-col md:flex-row items-center justify-between gap-8 border border-white/10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
          
          <div className="relative z-10 text-center md:text-left text-white md:w-1/2">
            <div className="bg-white/10 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 mx-auto md:mx-0 backdrop-blur-md border border-white/10 shadow-lg shadow-white/5">
              <Package size={32} className="text-white"/>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black mb-4 tracking-tight drop-shadow-lg">Koper Bikin Ribet & Capek?</h2>
            <p className="text-indigo-100 mb-8 font-medium leading-relaxed max-w-sm mx-auto md:mx-0">
              Titipkan barang bawaan Anda di fasilitas Smart Loker kami yang tersebar di stasiun utama Yogyakarta & Solo. Terpantau CCTV 24 Jam.
            </p>
            <ul className="space-y-3 mb-10 text-sm font-bold text-white hidden sm:block">
              <li className="flex items-center gap-2.5"><CheckCircle2 size={18} className="text-green-400"/> Akses mandiri via QR Code (Loker Medium & Large)</li>
              <li className="flex items-center gap-2.5"><CheckCircle2 size={18} className="text-green-400"/> Terintegrasi di 5 lokasi strategis</li>
            </ul>
            <button onClick={() => navigate('/loker')} className="bg-white text-indigo-600 px-8 py-4 rounded-2xl font-black text-sm hover:scale-105 hover:shadow-2xl hover:shadow-white/20 transition-all shadow-xl w-full sm:w-auto active:scale-95 hover:-translate-y-1">
              Klaim Miles/Sewa Loker
            </button>
          </div>

          <div className="relative z-10 md:w-5/12 hidden md:block">
            <img 
              src="https://mvk-mash.com/wp-content/uploads/2023/10/mvk-mash.jpg" 
              alt="Smart Locker" 
              className="rounded-3xl shadow-2xl border-4 border-white/20 rotate-3 group-hover:rotate-0 transition-transform duration-500 ease-in-out"
            />
          </div>
        </div>
      </div>

    </div>
  );
}