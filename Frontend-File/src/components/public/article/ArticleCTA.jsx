import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bike } from 'lucide-react';

const ArticleCTA = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-white text-slate-900 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-xl border border-slate-100 group mb-16">
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8">
        <div className="text-center md:text-left flex-grow">
          <h3 className="text-xl md:text-2xl font-black mb-2 tracking-tight text-slate-950">
            Siap Menjelajah Jogja Tanpa Ribet?
          </h3>
          <p className="text-slate-600 text-sm font-medium max-w-xl leading-relaxed">
            Brother Trans menyediakan armada motor prima dengan 2 helm bersih & jas hujan. Rasakan kemudahan sewa motor yang aman dan terpercaya.
          </p>
        </div>

        <button 
          onClick={() => navigate('/motor')}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-7 rounded-xl transition-all shadow-md shadow-blue-500/10 flex items-center gap-2.5 whitespace-nowrap active:scale-95 hover:-translate-y-0.5"
        >
          <Bike size={20} /> Sewa Motor Sekarang
        </button>
      </div>
      
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-[80px] opacity-70 -translate-y-1/2 translate-x-1/3 transition-opacity"></div>
    </div>
  );
};

export default ArticleCTA;