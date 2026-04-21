import React, { useState, useEffect } from 'react';
import { User, Phone, Mail, CheckCircle2 } from 'lucide-react';

// [FIX 4] Ambil API_URL dari env — sama seperti file checkout lainnya
const API_URL = import.meta.env.VITE_API_URL?.trim() || '';

const RenterForm = ({ user, paymentMethod, setPaymentMethod }) => {
  // [FIX 4] Fetch info rekening dari backend — tidak ada nomor rekening hardcoded
  const [paymentInfo, setPaymentInfo] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/api/payment-info`)
      .then((r) => r.json())
      .then((data) => { if (data.success) setPaymentInfo(data.data); })
      .catch(() => {/* silent fail */});
  }, []);

  return (
    <div className="flex flex-col gap-6">
      
      {/* --- INFORMASI PENYEWA --- */}
      <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-sm border border-slate-100">
        <h3 className="text-xl font-black text-brand-dark mb-6 border-b border-slate-100 pb-4">
          Informasi Penyewa
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Nama Lengkap</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                value={user?.name || ''} 
                disabled 
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none" 
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Nomor WhatsApp</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  value={user?.phone || ''} 
                  disabled 
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none" 
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Email Aktif</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="email" 
                  value={user?.email || ''} 
                  disabled 
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none" 
                />
              </div>
            </div>
          </div>
          <p className="text-[10px] text-amber-500 font-bold mt-2 bg-amber-50 p-3 rounded-xl border border-amber-100">
            * Informasi di atas ditarik otomatis dari akun Anda. Pastikan nomor WhatsApp aktif untuk menerima instruksi pengambilan unit.
          </p>
        </div>
      </div>

      {/* --- METODE PEMBAYARAN --- */}
      {/* [FIX 4] Nomor rekening diambil dari paymentInfo (API), bukan hardcoded */}
      <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-sm border border-slate-100">
        <h3 className="text-xl font-black text-brand-dark mb-6 border-b border-slate-100 pb-4">
          Pilih Rekening Tujuan
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Pilihan 1: Bank BCA */}
          <button
            type="button"
            onClick={() => setPaymentMethod('bca')}
            className={`relative flex flex-col items-start p-5 rounded-2xl border-2 transition-all duration-300 ${
              paymentMethod === 'bca' 
                ? 'border-blue-600 bg-blue-50/50 shadow-md' 
                : 'border-slate-100 hover:border-blue-200 hover:bg-slate-50'
            }`}
          >
            {paymentMethod === 'bca' && (
              <CheckCircle2 className="absolute top-4 right-4 text-blue-600" size={20} />
            )}
            
            <div className="italic font-black text-2xl text-blue-800 tracking-tighter mb-4 ml-1">
              BCA
            </div>
            
            <div className="text-left w-full mt-auto">
              <span className={`block font-black text-sm mb-1.5 ${paymentMethod === 'bca' ? 'text-blue-900' : 'text-slate-600'}`}>
                Transfer Bank BCA
              </span>
              <div className="flex items-center gap-2">
                {/* [FIX 4] Nomor dari API — tampil loading jika belum dimuat */}
                <span className="text-sm text-slate-600 font-black tracking-widest bg-white border border-slate-200 px-3 py-1.5 rounded-lg w-full">
                  {paymentInfo?.bca?.number || '—'}
                </span>
              </div>
              {paymentInfo?.bca?.name && (
                <span className="text-xs text-slate-400 mt-1 block">a/n {paymentInfo.bca.name}</span>
              )}
            </div>
          </button>

          {/* Pilihan 2: Bank Mandiri */}
          <button
            type="button"
            onClick={() => setPaymentMethod('mandiri')}
            className={`relative flex flex-col items-start p-5 rounded-2xl border-2 transition-all duration-300 ${
              paymentMethod === 'mandiri' 
                ? 'border-blue-500 bg-blue-50/50 shadow-md' 
                : 'border-slate-100 hover:border-blue-200 hover:bg-slate-50'
            }`}
          >
            {paymentMethod === 'mandiri' && (
              <CheckCircle2 className="absolute top-4 right-4 text-blue-500" size={20} />
            )}
            
            <div className="flex items-center gap-1.5 mb-4 ml-1">
               <div className="w-7 h-7 bg-amber-400 rounded-full flex items-center justify-center">
                 <div className="w-3.5 h-3.5 bg-blue-900 rounded-full"></div>
               </div>
               <span className="lowercase font-black text-2xl text-blue-900 tracking-tighter">mandiri</span>
            </div>

            <div className="text-left w-full mt-auto">
              <span className={`block font-black text-sm mb-1.5 ${paymentMethod === 'mandiri' ? 'text-blue-900' : 'text-slate-600'}`}>
                Transfer Bank Mandiri
              </span>
              <div className="flex items-center gap-2">
                {/* [FIX 4] Nomor dari API */}
                <span className="text-sm text-slate-600 font-black tracking-widest bg-white border border-slate-200 px-3 py-1.5 rounded-lg w-full">
                  {paymentInfo?.mandiri?.number || '—'}
                </span>
              </div>
              {paymentInfo?.mandiri?.name && (
                <span className="text-xs text-slate-400 mt-1 block">a/n {paymentInfo.mandiri.name}</span>
              )}
            </div>
          </button>

        </div>
        
        <p className="text-[10px] text-slate-400 font-bold mt-4 text-center">
          * Pastikan Anda mentransfer tepat sesuai nominal hingga 3 digit terakhir.
        </p>
      </div>

    </div>
  );
};

export default RenterForm;
