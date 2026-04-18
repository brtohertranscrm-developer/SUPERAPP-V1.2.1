import React from 'react';
import { Receipt, X, MapPin, QrCode } from 'lucide-react';

const TripTicketModal = ({ ticket, onClose, user }) => {
  if (!ticket) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      ></div>

      <div className="relative bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden animate-fade-in-up">
        
        {/* Modal Header */}
        <div className="bg-brand-dark text-white px-6 py-4 flex items-center justify-between relative overflow-hidden">
          <div className="relative z-10 flex items-center gap-2">
            <Receipt size={20} className="text-rose-500"/>
            <h2 className="text-lg font-black tracking-wide">E-Tiket Official</h2>
          </div>
          <button onClick={onClose} className="relative z-10 p-2 text-white/50 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors">
            <X size={20} />
          </button>
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/20 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
        </div>

        {/* Modal Body - Ticket Style */}
        <div className="p-8 border-b-2 border-dashed border-gray-200 relative">
          {/* Lubang Tiket Kiri Kanan */}
          <div className="absolute -left-4 bottom-[-16px] w-8 h-8 bg-slate-900/60 rounded-full"></div>
          <div className="absolute -right-4 bottom-[-16px] w-8 h-8 bg-slate-900/60 rounded-full"></div>
          
          <div className="text-center mb-6">
            <h3 className="text-2xl font-black text-brand-dark mb-1">{ticket.item_name}</h3>
            <p className="text-xs font-bold text-gray-500 flex items-center justify-center gap-1.5"><MapPin size={12} className="text-brand-primary"/>
              {(() => {
                const loc = ticket.location || '';
                const l = loc.toLowerCase();
                if (l.includes('solo') || l.includes('balapan')) return 'Solo';
                return 'Yogyakarta';
              })()}
            </p>
          </div>

          <div className="bg-gray-50 p-4 rounded-2xl flex justify-center items-center border border-gray-200 mb-6 shadow-inner">
            <QrCode size={160} strokeWidth={1} className="text-brand-dark" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Ambil</div>
              <div className="font-bold text-brand-dark text-sm">{ticket.start_date}</div>
            </div>
            <div>
              <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Kembali</div>
              <div className="font-bold text-brand-dark text-sm">{ticket.end_date}</div>
            </div>
            <div className="col-span-2 mt-2">
              <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Nama Penyewa</div>
              <div className="font-bold text-brand-dark text-sm">{user?.name}</div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-gray-50 p-6 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Lunas</div>
            <div className="text-xl font-black text-brand-primary">Rp {ticket.total_price.toLocaleString('id-ID')}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Status</div>
            <div className="text-xs font-black text-green-600 bg-green-100 px-3 py-1 rounded-lg inline-block uppercase tracking-wider">{ticket.status}</div>
          </div>
        </div>

        <div className="bg-brand-dark text-center py-3 text-[10px] font-bold text-white/70 uppercase tracking-widest">
          Tunjukkan QR ini ke admin saat serah terima
        </div>
      </div>
    </div>
  );
};

export default TripTicketModal;