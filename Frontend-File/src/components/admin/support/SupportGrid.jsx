import React from 'react';
import { CheckCircle, Clock, Loader2, Mail, MessageCircle, Phone } from 'lucide-react';

const normalizeWhatsAppNumber = (value) => {
  const raw = String(value || '').replace(/[^\d+]/g, '');
  if (!raw) return '';

  if (raw.startsWith('62')) return raw;
  if (raw.startsWith('+62')) return raw.slice(1);
  if (raw.startsWith('0')) return `62${raw.slice(1)}`;
  return raw;
};

const buildWhatsAppLink = (ticket) => {
  const phone = normalizeWhatsAppNumber(ticket?.user_phone);
  if (!phone) return '';

  const lines = [
    `Halo ${ticket?.user_name || 'Kak'},`,
    `kami dari Brother Trans sedang follow up tiket ${ticket?.ticket_number || '-'}.`,
    '',
    `Subjek: ${ticket?.subject || '-'}`,
    ticket?.order_id ? `Order ID: ${ticket.order_id}` : '',
  ].filter(Boolean);

  return `https://wa.me/${phone}?text=${encodeURIComponent(lines.join('\n'))}`;
};

const SupportGrid = ({ tickets, isLoading, onUpdateStatus }) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-20 bg-white rounded-[2rem] shadow-sm border border-slate-100">
        <Loader2 className="animate-spin text-amber-500" size={40} />
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="text-center p-20 bg-white rounded-[2rem] shadow-sm border border-slate-100">
        <CheckCircle size={48} className="mx-auto text-green-400 mb-4 opacity-50" />
        <h3 className="text-xl font-black text-slate-900 mb-2">Semua Aman!</h3>
        <p className="text-slate-500 font-bold">Tidak ada tiket komplain dari pelanggan yang sesuai filter.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {tickets.map((ticket) => (
        <div key={ticket.id} className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 sm:p-8 flex flex-col group hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
          
          {/* Top Section: Badges */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <span className="font-mono text-xs font-black text-indigo-500 bg-indigo-50 px-3 py-1 rounded-md">{ticket.ticket_number}</span>
              {ticket.order_id && (
                <span className="ml-2 font-mono text-[10px] font-bold text-slate-400">Order: {ticket.order_id}</span>
              )}
            </div>
            <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-sm
              ${ticket.status === 'pending' ? 'bg-amber-100 text-amber-700 border border-amber-200 animate-pulse' : 'bg-green-100 text-green-700 border border-green-200'}`}>
              {ticket.status === 'pending' ? <><Clock size={12}/> Menunggu</> : <><CheckCircle size={12}/> Selesai</>}
            </div>
          </div>

          {/* Main Content: User & Subject */}
          <div className="mb-6 flex-1">
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-50">
              <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-sm shadow-sm">
                {ticket.user_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-black text-slate-900 leading-tight">{ticket.user_name}</h3>
                <p className="text-[10px] font-bold text-slate-400 mt-0.5">{new Date(ticket.created_at).toLocaleString('id-ID')}</p>
              </div>
            </div>

            <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <Phone size={14} className="text-emerald-600 shrink-0" />
                <span className="text-xs font-bold text-slate-700 truncate">
                  {ticket.user_phone || 'Nomor belum tersedia'}
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <Mail size={14} className="text-indigo-600 shrink-0" />
                <span className="text-xs font-bold text-slate-700 truncate">
                  {ticket.user_email || 'Email belum tersedia'}
                </span>
              </div>
            </div>

            <h4 className="font-black text-slate-900 text-lg mb-2">{ticket.subject}</h4>
            <p className="text-slate-600 text-sm leading-relaxed bg-slate-50 p-4 rounded-2xl italic border border-slate-100">
              "{ticket.message}"
            </p>
          </div>

          {/* Action Button */}
          <div className="mt-auto pt-2 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <a
                href={buildWhatsAppLink(ticket) || undefined}
                target="_blank"
                rel="noreferrer"
                className={`flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-xs font-black uppercase tracking-widest transition-colors ${
                  ticket.user_phone
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    : 'pointer-events-none border-slate-200 bg-slate-50 text-slate-300'
                }`}
              >
                <MessageCircle size={15} />
                Chat WA
              </a>

              <a
                href={ticket.user_email ? `mailto:${ticket.user_email}?subject=${encodeURIComponent(`Follow up tiket ${ticket.ticket_number}`)}` : undefined}
                className={`flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-xs font-black uppercase tracking-widest transition-colors ${
                  ticket.user_email
                    ? 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                    : 'pointer-events-none border-slate-200 bg-slate-50 text-slate-300'
                }`}
              >
                <Mail size={15} />
                Email
              </a>
            </div>

            <button 
              onClick={() => onUpdateStatus(ticket.id, ticket.status)}
              className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-2 shadow-sm
                ${ticket.status === 'pending' 
                  ? 'bg-slate-900 text-white hover:bg-amber-500' 
                  : 'bg-slate-50 text-slate-400 hover:bg-slate-200 hover:text-slate-600'}`}
            >
              {ticket.status === 'pending' ? 'Tandai Selesai' : 'Buka Kembali Tiket'}
            </button>
          </div>

        </div>
      ))}
    </div>
  );
};

export default SupportGrid;
