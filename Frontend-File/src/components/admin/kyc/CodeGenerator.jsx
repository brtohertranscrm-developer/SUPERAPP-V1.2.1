import React, { useState, useEffect } from 'react';
import { Key, Copy, RefreshCw, CheckCircle } from 'lucide-react';

const CodeGenerator = () => {
  const [accessCode, setAccessCode] = useState('BT-XXXXXX');
  const [isCopied, setIsCopied] = useState(false);

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'BT-';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setAccessCode(code);
    setIsCopied(false);
  };

  const copyToClipboard = () => {
    if (accessCode === 'BT-XXXXXX') return;
    navigator.clipboard.writeText(accessCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Buat kode otomatis saat komponen pertama kali dirender
  useEffect(() => {
    generateCode();
  }, []);

  return (
    <div className="bg-gradient-to-br from-brand-dark to-slate-800 rounded-[2rem] p-6 sm:p-8 shadow-xl border border-gray-800 mb-8 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500 rounded-full blur-[80px] opacity-20 -mr-10 -mt-10 pointer-events-none"></div>
      
      <div className="relative z-10 text-center md:text-left flex-1">
        <h2 className="text-white font-black text-xl flex items-center justify-center md:justify-start gap-2 mb-2">
          <Key className="text-amber-500" size={20}/> KYC Code Generator
        </h2>
        <p className="text-gray-400 text-sm max-w-md mx-auto md:mx-0">
          Berikan kode unik ini kepada pelanggan setelah Anda mengecek dan memvalidasi foto KTP mereka melalui chat WhatsApp.
        </p>
      </div>

      <div className="relative z-10 w-full md:w-auto bg-white/10 p-2 rounded-2xl backdrop-blur-sm border border-white/10 flex flex-col sm:flex-row items-center gap-2">
        <div className="bg-brand-dark px-6 py-3 rounded-xl border border-gray-700 w-full sm:w-48 text-center flex items-center justify-center gap-3">
          <span className="font-mono font-black text-2xl tracking-widest text-amber-400">{accessCode}</span>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button onClick={generateCode} className="flex-1 sm:flex-none p-3.5 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-colors flex items-center justify-center" title="Buat Kode Baru">
            <RefreshCw size={20} />
          </button>
          <button onClick={copyToClipboard} className={`flex-1 sm:flex-none p-3.5 font-bold rounded-xl transition-colors flex items-center justify-center gap-2 ${isCopied ? 'bg-green-500 text-white' : 'bg-amber-500 hover:bg-amber-600 text-brand-dark'}`}>
            {isCopied ? <CheckCircle size={20} /> : <Copy size={20} />}
            <span className="hidden sm:inline">{isCopied ? 'Tersalin!' : 'Salin Kode'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CodeGenerator;