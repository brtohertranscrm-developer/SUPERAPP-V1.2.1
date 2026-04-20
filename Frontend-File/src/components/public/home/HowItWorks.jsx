import React from 'react';
import { ShieldCheck, Wrench, Clock } from 'lucide-react';

const HowItWorks = () => {
  return (
    <div className="max-w-6xl mx-auto px-4 py-16 relative z-20">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6"><ShieldCheck size={32}/></div>
          <h3 className="text-xl font-black mb-3 text-slate-900">Harga Terjangkau & Transparan</h3>
          <p className="text-slate-500 text-sm font-medium leading-relaxed">Nikmati perjalanan tanpa biaya tersembunyi dengan tarif yang jujur sejak awal.</p>
        </div>
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mb-6"><Wrench size={32}/></div>
          <h3 className="text-xl font-black mb-3 text-slate-900">Perawatan Berkala</h3>
          <p className="text-slate-500 text-sm font-medium leading-relaxed">Armada diservis rutin oleh mekanik handal berstandar pabrikan. Performa selalu optimal.</p>
        </div>
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-6"><Clock size={32}/></div>
          <h3 className="text-xl font-black mb-3 text-slate-900">Layanan 24/7</h3>
          <p className="text-slate-500 text-sm font-medium leading-relaxed">Tim darurat jalan raya (RSA) & support siap sedia membantu kapan saja jika terjadi kendala.</p>
        </div>
      </div>
    </div>
  );
};

export default HowItWorks;