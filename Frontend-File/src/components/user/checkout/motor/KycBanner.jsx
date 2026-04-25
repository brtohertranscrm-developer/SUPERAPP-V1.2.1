import React from 'react';
import { ShieldAlert } from 'lucide-react';

export default function KycBanner({ status, onNavigate }) {
  return (
    <div className="bg-rose-50 border-2 border-rose-200 rounded-2xl p-5 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="bg-rose-100 p-2.5 rounded-xl text-rose-600 shrink-0 mt-0.5">
          <ShieldAlert size={20} />
        </div>
        <div>
          <h3 className="text-rose-700 font-black text-base">Verifikasi Identitas Diperlukan</h3>
          <p className="text-rose-600 text-sm font-medium mt-0.5">
            Status KYC kamu saat ini:{' '}
            <span className="uppercase font-black">{status || 'UNVERIFIED'}</span>.
            Selesaikan verifikasi terlebih dahulu untuk melanjutkan pesanan.
          </p>
        </div>
      </div>
      <button
        onClick={onNavigate}
        className="bg-rose-600 hover:bg-rose-700 text-white font-black px-5 py-2.5 rounded-xl text-sm transition-colors whitespace-nowrap w-full sm:w-auto active:scale-95"
      >
        Verifikasi Sekarang
      </button>
    </div>
  );
}

