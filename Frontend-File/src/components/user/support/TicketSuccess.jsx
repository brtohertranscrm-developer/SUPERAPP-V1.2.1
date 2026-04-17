import React from 'react';
import { CheckCircle2 } from 'lucide-react';

const TicketSuccess = ({ ticketNumber, navigate }) => {
  return (
    <div className="text-center py-10 relative z-10 animate-fade-in-up">
      <div className="w-24 h-24 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle2 size={48} />
      </div>
      <h2 className="text-3xl font-black mb-2 text-slate-900">Tiket Terkirim!</h2>
      <p className="text-slate-500 font-medium mb-6">Admin kami akan segera meninjau dan merespons keluhan Anda.</p>
      
      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 inline-block mb-8">
        <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Nomor Tiket Anda</span>
        <span className="text-2xl font-mono font-black text-indigo-600 tracking-wider">{ticketNumber}</span>
      </div>
      
      <button 
        onClick={() => navigate('/dashboard')}
        className="block w-full sm:w-auto mx-auto px-8 py-4 bg-slate-900 text-white font-black rounded-xl hover:bg-indigo-600 transition-colors shadow-lg active:scale-95"
      >
        Kembali ke Dashboard
      </button>
    </div>
  );
};

export default TicketSuccess;