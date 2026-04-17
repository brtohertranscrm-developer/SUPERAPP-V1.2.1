import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useUserSupport } from '../../hooks/useUserSupport';
import TicketForm from '../../components/user/support/TicketForm';
import TicketSuccess from '../../components/user/support/TicketSuccess';

export default function SupportPage() {
  const {
    user, navigate,
    formData, handleChange,
    activeOrder,
    isSubmitting, isSuccess, ticketNumber,
    handleSubmit
  } = useUserSupport();

  if (!user) return null;

  return (
    <div className="py-8 sm:py-12 bg-slate-50 min-h-screen font-sans text-slate-900">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* NAVIGASI KEMBALI */}
        <button 
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold mb-8 transition-colors"
        >
          <ArrowLeft size={20} /> Kembali ke Dashboard
        </button>

        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 p-6 sm:p-10 border border-slate-100 relative overflow-hidden animate-fade-in-up">
          
          {/* Efek Latar */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

          {isSuccess ? (
            <TicketSuccess ticketNumber={ticketNumber} navigate={navigate} />
          ) : (
            <TicketForm 
              formData={formData}
              handleChange={handleChange}
              activeOrder={activeOrder}
              isSubmitting={isSubmitting}
              handleSubmit={handleSubmit}
            />
          )}

        </div>
      </div>
    </div>
  );
}