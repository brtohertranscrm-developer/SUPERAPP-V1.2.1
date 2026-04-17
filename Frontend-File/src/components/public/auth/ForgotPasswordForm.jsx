import React, { useState } from 'react';
import { Mail, Loader2, AlertCircle, KeyRound, CheckCircle2, ChevronLeft, ShieldAlert } from 'lucide-react';

const sanitize = (str = '') => str.replace(/[<>"'`]/g, '').slice(0, 500);
const isValidEmail = (v = '') => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

const ForgotPasswordForm = ({ isLoading, status, setStatus, onSubmit, onBackClick }) => {
  const [email,     setEmail]     = useState('');
  const [fieldErr,  setFieldErr]  = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const clean = sanitize(email).toLowerCase();
    if (!isValidEmail(clean)) {
      setFieldErr('Format email tidak valid.');
      return;
    }
    setFieldErr('');
    const success = await onSubmit(clean);
    if (success) setEmail('');
  };

  return (
    <div className="animate-fade-in-up w-full">

      {/* Tombol kembali */}
      <button
        onClick={() => { onBackClick(); setStatus({ type: '', message: '' }); setFieldErr(''); }}
        className="flex items-center gap-2 text-slate-400 hover:text-slate-900 font-bold text-[10px] uppercase tracking-widest mb-7 transition-colors"
      >
        <ChevronLeft size={16} /> Kembali ke Login
      </button>

      {/* Header */}
      <div className="text-center mb-7">
        <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-amber-100 -rotate-3">
          <KeyRound size={30} className="rotate-3" />
        </div>
        <h1 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">Lupa Password?</h1>
        <p className="text-slate-500 text-sm font-medium leading-relaxed max-w-xs mx-auto">
          Masukkan email terdaftar Anda. Kami kirimkan tautan untuk membuat password baru.
        </p>
      </div>

      {/* Status */}
      {status.message && (
        <div className={`mb-5 p-4 rounded-2xl text-sm font-bold flex items-start gap-3 border ${
          status.type === 'success'
            ? 'bg-green-50 text-green-700 border-green-100'
            : 'bg-red-50 text-red-600 border-red-100'
        }`}>
          {status.type === 'success'
            ? <CheckCircle2 size={20} className="shrink-0 mt-0.5" />
            : <AlertCircle size={20} className="shrink-0 mt-0.5" />
          }
          <p>{status.message}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">
            Email Terdaftar
          </label>
          <div className="relative">
            <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (fieldErr) setFieldErr(''); }}
              autoComplete="email"
              inputMode="email"
              placeholder="email@anda.com"
              disabled={status.type === 'success'}
              className={`w-full py-4 bg-slate-50 border rounded-2xl text-sm font-bold text-slate-900 focus:ring-2 focus:border-transparent outline-none transition-all placeholder:text-slate-300 placeholder:font-normal disabled:opacity-50 ${
                fieldErr ? 'border-red-300 focus:ring-red-300' : 'border-slate-200 focus:ring-brand-primary'
              }`}
              style={{ paddingLeft: '3.25rem' }}
            />
          </div>
          {fieldErr && <p className="text-red-500 text-[11px] font-bold mt-1.5 ml-1">{fieldErr}</p>}
        </div>

        <button
          type="submit"
          disabled={isLoading || status.type === 'success'}
          className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-brand-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-slate-900/10 active:scale-[0.98]"
        >
          {isLoading
            ? <><Loader2 className="animate-spin" size={20} /> Mengirim...</>
            : status.type === 'success'
            ? <><CheckCircle2 size={20} /> Email Terkirim!</>
            : 'Kirim Tautan Reset'
          }
        </button>
      </form>

      {/* Security note */}
      <div className="mt-5 flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-bold">
        <ShieldAlert size={12} />
        <span>Tautan akan kedaluwarsa dalam 1 jam.</span>
      </div>
    </div>
  );
};

export default ForgotPasswordForm;
