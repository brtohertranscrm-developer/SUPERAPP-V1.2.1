import React, { useState } from 'react';
import { ShieldAlert, MessageCircle, KeyRound, Loader2, AlertTriangle, XCircle } from 'lucide-react';
import { WA_CONTACTS, buildWaLink } from '../../../config/contacts';

const KycStatus = ({ status, verifyKycCode }) => {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const waMessage = "Halo Admin Brother Trans, saya ingin melakukan verifikasi KYC (KTP & Foto Selfie) untuk akun saya.";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!code.trim()) {
      setError('Kode tidak boleh kosong');
      return;
    }

    setIsLoading(true);
    setError('');

    // Memanggil fungsi verifikasi dari Dashboard
    const result = await verifyKycCode(code);
    if (!result.success) {
      setError(result.error || 'Kode tidak valid atau salah.');
    } else {
      alert('Verifikasi Berhasil! Selamat datang di Brother Trans.');
    }
    setIsLoading(false);
  };

  // 1. Konfigurasi Konten Berdasarkan Status dari Admin
  let config = {
    title: 'Verifikasi Identitas Diperlukan',
    desc: 'Untuk mencegah penipuan, kami memerlukan foto KTP & Selfie Anda. Silakan kirim via WhatsApp, lalu masukkan Kode Unik dari Admin di sini.',
    color: 'from-orange-500 to-rose-500', // Warna peringatan (Pending)
    icon: <ShieldAlert size={24} className="text-white" />
  };

  if (status === 'rejected') {
    config = {
      title: 'Verifikasi Ditolak',
      desc: 'Mohon maaf, dokumen verifikasi Anda sebelumnya ditolak. Silakan hubungi Admin untuk klarifikasi dan mengirim dokumen yang benar.',
      color: 'from-rose-600 to-red-800', // Warna Merah (Ditolak)
      icon: <XCircle size={24} className="text-white" />
    };
  } else if (status === 'frozen') {
     config = {
      title: 'Akun Dibekukan',
      desc: 'Akun Anda saat ini dibekukan oleh Admin karena alasan tertentu. Silakan hubungi Admin untuk informasi lebih lanjut.',
      color: 'from-slate-700 to-slate-900', // Warna Gelap (Dibekukan)
      icon: <AlertTriangle size={24} className="text-white" />
    };
  }

  return (
    <div className={`bg-gradient-to-br ${config.color} rounded-[2rem] p-6 sm:p-8 text-white shadow-lg relative overflow-hidden transition-all duration-500`}>
      {/* Efek Cahaya Latar Belakang */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

      <div className="relative z-10 flex flex-col lg:flex-row gap-8 items-start lg:items-center justify-between">
        
        {/* BAGIAN KIRI: Info & Tombol WA */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm border border-white/20">
              {config.icon}
            </div>
            <h3 className="text-xl sm:text-2xl font-black drop-shadow-sm">{config.title}</h3>
          </div>
          <p className="text-white/90 text-sm font-medium leading-relaxed max-w-lg mb-6">
            {config.desc}
          </p>

          <a
            href={buildWaLink(WA_CONTACTS.KYC_ADMIN.phone_wa, waMessage)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3.5 bg-[#25D366] hover:bg-[#20bd5a] text-white font-black rounded-xl text-sm transition-all hover:scale-105 shadow-xl active:scale-95"
          >
            <MessageCircle size={18} />
            Kirim Dokumen via WhatsApp
          </a>
        </div>

        {/* BAGIAN KANAN: Form Input Kode (Hanya tampil jika akun TIDAK dibekukan) */}
        {status !== 'frozen' && (
          <div className="w-full lg:w-80 bg-white/10 backdrop-blur-md border border-white/20 p-5 rounded-2xl shrink-0">
            <h4 className="text-sm font-bold mb-1">Sudah dapat kode?</h4>
            <p className="text-[11px] text-white/80 mb-4">Masukkan kode unik dari Admin di sini.</p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <KeyRound size={16} className="text-slate-400" />
                  </div>
                  <input
                    type="text"
                    maxLength={10}
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="Contoh: BT-A8X9B" 
                    className="w-full pl-10 pr-4 py-3 bg-white text-slate-900 placeholder-slate-400 rounded-xl text-sm font-black tracking-widest outline-none focus:ring-4 focus:ring-white/30 transition-all uppercase shadow-inner"
                    disabled={isLoading}
                  />
                </div>
                {error && <p className="text-[11px] text-rose-200 mt-1.5 font-bold ml-1">{error}</p>}
              </div>

              <button
                type="submit"
                disabled={isLoading || !code.trim()}
                className="w-full py-3 bg-slate-900 hover:bg-black text-white font-black rounded-xl text-sm transition-colors flex justify-center items-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : 'Verifikasi Sekarang'}
              </button>
            </form>
          </div>
        )}
        
      </div>
    </div>
  );
};

export default KycStatus;
