import React from 'react';
import { Loader2 } from 'lucide-react';

export default function ProcessingOverlay() {
  return (
    <div className="fixed inset-0 bg-slate-900/85 z-[100] backdrop-blur-sm flex flex-col items-center justify-center text-white px-4">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
        <div className="w-16 h-16 bg-rose-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <Loader2 size={32} className="text-rose-500 animate-spin" />
        </div>
        <h2 className="text-xl font-black text-slate-900 mb-2">Memproses Pesanan</h2>
        <p className="text-slate-500 text-sm font-medium">
          Mohon jangan tutup atau muat ulang halaman ini. Pesanan kamu sedang dikonfirmasi.
        </p>
      </div>
    </div>
  );
}

