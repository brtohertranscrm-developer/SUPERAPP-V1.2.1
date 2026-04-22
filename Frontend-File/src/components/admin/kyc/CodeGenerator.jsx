import React from 'react';
import { KeyRound, MessageCircleMore, ShieldCheck } from 'lucide-react';

const steps = [
  {
    icon: <MessageCircleMore size={16} className="text-emerald-600" />,
    title: 'Cek dokumen via WhatsApp',
    desc: 'Pastikan foto KTP dan selfie pelanggan sudah cocok sebelum memberi kode.',
  },
  {
    icon: <KeyRound size={16} className="text-indigo-600" />,
    title: 'Generate kode dari baris user',
    desc: 'Klik tombol Buat Kode pada pelanggan yang dipilih. Kode akan tersimpan ke backend dan otomatis tersalin.',
  },
  {
    icon: <ShieldCheck size={16} className="text-amber-600" />,
    title: 'Tunggu user submit kode',
    desc: 'Setelah user memasukkan kode di dashboard, status KYC bisa lanjut diverifikasi atau ditindak manual.',
  },
];

const CodeGenerator = () => {
  return (
    <div className="bg-gradient-to-br from-brand-dark to-slate-800 rounded-[2rem] p-6 sm:p-8 shadow-xl border border-gray-800 mb-8 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500 rounded-full blur-[80px] opacity-20 -mr-10 -mt-10 pointer-events-none" />

      <div className="relative z-10">
        <h2 className="text-white font-black text-xl flex items-center gap-2 mb-2">
          <KeyRound className="text-amber-400" size={20} /> Alur Generate Kode KYC
        </h2>
        <p className="text-gray-300 text-sm max-w-2xl">
          Generator kode sekarang terhubung langsung ke data pelanggan. Untuk mencegah salah kirim kode, pembuatan kode dilakukan dari tombol aksi pada masing-masing user di tabel verifikasi.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5">
          {steps.map((step) => (
            <div
              key={step.title}
              className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-4"
            >
              <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center mb-3 shadow-sm">
                {step.icon}
              </div>
              <div className="text-white font-black text-sm">{step.title}</div>
              <div className="text-gray-300 text-xs font-medium mt-1 leading-relaxed">{step.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CodeGenerator;
