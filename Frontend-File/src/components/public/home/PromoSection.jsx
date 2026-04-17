import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ticket, ChevronRight, ChevronLeft, Zap, Flame, Users } from 'lucide-react';

const PromoSection = ({ promotions }) => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);

  // Perbaikan Poin 19: Gunakan useCallback agar referensinya stabil
  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev === promotions.length - 1 ? 0 : prev + 1));
  }, [promotions.length]);

  const prevSlide = () => setCurrentSlide((prev) => (prev === 0 ? promotions.length - 1 : prev - 1));

  useEffect(() => {
    if (promotions.length <= 1) return;
    const slideInterval = setInterval(nextSlide, 5000);
    return () => clearInterval(slideInterval);
  }, [promotions.length, nextSlide]); // Sekarang aman dan tidak render ulang terus

  const getPromoIcon = (tag) => {
    if (!tag) return <Zap size={14} className="text-white"/>;
    const t = tag.toUpperCase();
    if (t.includes('FLASH') || t.includes('HOT') || t.includes('SALE')) return <Flame size={14} className="text-white"/>;
    if (t.includes('USER') || t.includes('BARU') || t.includes('TEMAN')) return <Users size={14} className="text-white"/>;
    return <Zap size={14} className="text-white"/>;
  };

  if (promotions.length === 0) return null;

  return (
    <div className="-mt-12 sm:-mt-16 relative z-30 max-w-5xl mx-auto px-4">
      <div className="relative h-56 sm:h-72 rounded-3xl overflow-hidden shadow-2xl border border-white group bg-slate-900">
        
        {promotions.map((promo, index) => (
          <div key={promo.id} className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
            <img src={promo.image} alt={promo.title} className="w-full h-full object-cover opacity-80" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/50 to-transparent p-6 sm:p-8 flex flex-col justify-end">
              
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full mb-3 shadow-md">
                    {getPromoIcon(promo.tag)} {promo.tag}
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white mb-2 leading-tight drop-shadow-md">{promo.title}</h2>
                  <p className="text-slate-300 text-sm font-medium drop-shadow">{promo.desc}</p>
                </div>

                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md p-1.5 rounded-2xl w-max border border-white/20">
                  <div className="bg-slate-950 text-white px-4 py-2.5 rounded-xl flex items-center gap-2">
                    <Ticket size={16} className="text-rose-500"/>
                    <span className="font-mono font-black text-sm">{promo.code}</span>
                  </div>
                  <button onClick={() => navigate('/motor')} className="bg-white text-slate-900 px-4 py-2.5 rounded-xl font-black text-sm hover:bg-rose-500 hover:text-white transition-colors active:scale-95 flex items-center gap-1">
                    Klaim <ChevronRight size={16}/>
                  </button>
                </div>
              </div>

            </div>
          </div>
        ))}

        {promotions.length > 1 && (
          <>
            <button onClick={prevSlide} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 hover:bg-white/40 backdrop-blur-sm rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity z-20">
                <ChevronLeft size={20}/>
            </button>
            <button onClick={nextSlide} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 hover:bg-white/40 backdrop-blur-sm rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity z-20">
                <ChevronRight size={20}/>
            </button>
            <div className="absolute top-4 right-6 flex gap-1.5 z-20">
              {promotions.map((_, idx) => (
                <button key={idx} onClick={() => setCurrentSlide(idx)} className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentSlide ? 'w-6 bg-white' : 'w-2 bg-white/40'}`}></button>
              ))}
            </div>
          </>
        )}

      </div>
    </div>
  );
};

export default PromoSection;