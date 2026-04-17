import React from 'react';
import { LifeBuoy, FileText, Ticket, MessageSquare, Send, Loader2 } from 'lucide-react';

const TicketForm = ({ 
  formData, handleChange, 
  activeOrder, isSubmitting, handleSubmit 
}) => {
  return (
    <div className="relative z-10 animate-fade-in-up">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0">
          <LifeBuoy size={28} />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Pusat Bantuan</h1>
          <p className="text-slate-500 text-sm font-medium">Ada masalah? Ceritakan kepada kami, tim Brother siap membantu.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* 1. Kategori / Subjek */}
        <div>
          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Kategori Masalah</label>
          <div className="relative">
            <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <select 
              name="subject" 
              value={formData.subject}
              onChange={handleChange}
              className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
            >
              <option value="Kendala Kendaraan di Jalan">Kendala Kendaraan di Jalan (Mogok/Bocor)</option>
              <option value="Masalah Smart Loker">Loker Tidak Bisa Dibuka</option>
              <option value="Pertanyaan Pembayaran & Refund">Pertanyaan Pembayaran / Refund</option>
              <option value="Laporan Perilaku Admin">Komplain Layanan Admin</option>
              <option value="Lainnya">Lainnya / Saran Peningkatan</option>
            </select>
          </div>
        </div>

        {/* 2. Order ID */}
        <div>
          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1 flex justify-between">
            <span>ID Pesanan Terkait</span>
            <span className="text-slate-300 font-medium normal-case">Opsional</span>
          </label>
          <div className="relative">
            <Ticket className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              name="order_id" 
              value={formData.order_id}
              onChange={handleChange}
              placeholder={activeOrder ? activeOrder.id : "Contoh: TRX-BT-XXXXX"}
              className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none uppercase placeholder:normal-case placeholder:font-medium"
            />
          </div>
          {activeOrder && (
            <p className="text-xs text-indigo-500 mt-2 ml-1 font-medium">
              ✓ Otomatis mendeteksi pesanan aktif Anda ({activeOrder.item}).
            </p>
          )}
        </div>

        {/* 3. Pesan */}
        <div>
          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Detail Keluhan</label>
          <div className="relative">
            <MessageSquare className="absolute left-4 top-4 text-slate-400" size={18} />
            <textarea 
              name="message"
              required
              value={formData.message}
              onChange={handleChange}
              rows="5"
              placeholder="Ceritakan detail masalah yang Anda alami di sini..."
              className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
            ></textarea>
          </div>
        </div>

        {/* Tombol Kirim */}
        <button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full py-4 bg-indigo-600 text-white font-black rounded-xl hover:bg-slate-900 transition-all flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/20 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <><Loader2 className="animate-spin" size={20} /> Mengirim Tiket...</>
          ) : (
            <><Send size={18} /> Kirim Tiket Komplain</>
          )}
        </button>

      </form>
    </div>
  );
};

export default TicketForm;