import React from 'react';
import { Star, ChevronRight, Clock, XCircle } from 'lucide-react';

/**
 * ReviewMissionBanner
 * Props:
 *   status        — null | 'pending' | 'rejected' | 'approved'
 *   rejectReason  — string | null (diisi jika status = 'rejected')
 *   onClick       — buka ReviewPopup
 */
const ReviewMissionBanner = ({ status, rejectReason, onClick }) => {

  // Approved — jangan tampil banner
  if (status === 'approved') return null;

  // Pending — tampil status menunggu verifikasi
  if (status === 'pending') {
    return (
      <div className="bg-blue-50 border border-blue-100 rounded-[2rem] p-5 sm:p-6 flex items-center gap-4">
        <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center shrink-0">
          <Clock size={22} className="text-blue-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-blue-900 mb-0.5">Review sedang diverifikasi</p>
          <p className="text-xs text-blue-600 font-medium">
            Tim kami sedang mengecek screenshot kamu. Proses 1×24 jam.
            <span className="font-bold"> +50 Miles</span> akan masuk setelah diverifikasi.
          </p>
        </div>
      </div>
    );
  }

  // Rejected — bisa submit ulang
  if (status === 'rejected') {
    return (
      <button
        onClick={onClick}
        className="w-full bg-rose-50 border border-rose-100 rounded-[2rem] p-5 sm:p-6 flex items-center gap-4 hover:bg-rose-100 transition-colors text-left"
      >
        <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center shrink-0">
          <XCircle size={22} className="text-rose-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-rose-900 mb-0.5">Review ditolak — coba lagi</p>
          <p className="text-xs text-rose-600 font-medium">
            {rejectReason || 'Screenshot tidak memenuhi syarat.'}{' '}
            <span className="font-bold underline">Upload ulang →</span>
          </p>
        </div>
      </button>
    );
  }

  // Default — belum submit sama sekali
  return (
    <button
      onClick={onClick}
      className="w-full group text-left"
    >
      <div className="bg-gradient-to-r from-slate-900 via-brand-primary to-brand-secondary rounded-[2rem] p-5 sm:p-6 flex items-center gap-4 relative overflow-hidden">
        {/* Dekoratif bintang */}
        <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-10 pointer-events-none">
          <Star size={80} className="text-white fill-white" />
        </div>

        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shrink-0 border border-white/20">
          <div className="flex gap-0.5">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={9} className="text-white fill-white" />
            ))}
          </div>
        </div>

        <div className="flex-1 min-w-0 relative z-10">
          <p className="text-sm font-black text-white mb-0.5">
            Review kami di Google Maps
          </p>
          <p className="text-xs text-white/80 font-medium">
            Dapat <span className="font-black text-white">+50 Miles</span> setelah diverifikasi · Hanya 1×
          </p>
        </div>

        <div className="shrink-0 relative z-10">
          <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-colors border border-white/20">
            <ChevronRight size={16} className="text-white" />
          </div>
        </div>
      </div>
    </button>
  );
};

export default ReviewMissionBanner;
