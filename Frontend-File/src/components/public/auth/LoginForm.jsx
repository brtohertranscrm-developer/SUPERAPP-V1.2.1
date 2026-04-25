import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Mail, Lock, ArrowRight, Loader2, AlertCircle,
  Eye, EyeOff, ShieldAlert, Clock
} from 'lucide-react';
const sanitize = (str = '') => str.replace(/[<>"'`]/g, '').slice(0, 500);
const isValidEmail = (v = '') => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

// --- Password Input dengan peek -----------------------------------------------
const PasswordInput = ({ value, onChange, placeholder = 'Kata sandi Anda', name = 'password', autoComplete = 'current-password' }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
      <input
        type={show ? 'text' : 'password'}
        name={name}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className="w-full pl-13 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none transition-all placeholder:text-slate-300 placeholder:font-normal"
        style={{ paddingLeft: '3.25rem' }}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary"
        aria-label={show ? 'Sembunyikan password' : 'Tampilkan password'}
        tabIndex={-1}
      >
        {show ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </div>
  );
};

// --- Komponen utama LoginForm -------------------------------------------------
const LoginForm = ({ isLoading, error, lockSeconds, onSubmit, onForgotClick }) => {
  const [formData,   setFormData]   = useState({ email: '', password: '' });
  const [fieldError, setFieldError] = useState({ email: '', password: '' });

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear field error saat user mulai ketik
    if (fieldError[name]) setFieldError((prev) => ({ ...prev, [name]: '' }));
  }, [fieldError]);

  const validate = () => {
    const errs = { email: '', password: '' };
    if (!formData.email)                      errs.email    = 'Email wajib diisi.';
    else if (!isValidEmail(sanitize(formData.email))) errs.email = 'Format email tidak valid.';
    if (!formData.password)                   errs.password = 'Password wajib diisi.';
    else if (formData.password.length < 6)    errs.password = 'Minimal 6 karakter.';
    setFieldError(errs);
    return !errs.email && !errs.password;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (lockSeconds > 0) return;
    if (!validate()) return;
    onSubmit(formData);
  };

  const isLocked = lockSeconds > 0;

  return (
    <div className="animate-fade-in-up w-full">

      {/* -- Header -- */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-brand-primary rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-brand-primary/30 rotate-3">
          <Lock size={28} className="text-white -rotate-3" />
        </div>
        <h1 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">Selamat Datang</h1>
        <p className="text-slate-500 text-sm font-medium">Masuk untuk mengelola pesanan dan perjalanan Anda.</p>
      </div>

      {/* -- Error global / lockout -- */}
      {isLocked && (
        <div className="mb-5 bg-amber-50 text-amber-700 p-4 rounded-2xl text-sm font-bold flex items-start gap-3 border border-amber-200">
          <Clock size={20} className="shrink-0 mt-0.5 animate-pulse" />
          <div>
            <p className="font-black">Terlalu banyak percobaan gagal</p>
            <p className="font-medium mt-0.5">Coba lagi dalam <span className="font-black text-amber-800">{lockSeconds} detik</span></p>
          </div>
        </div>
      )}

      {error && !isLocked && (
        <div className="mb-5 bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-bold flex items-start gap-3 border border-red-100">
          <AlertCircle size={20} className="shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {/* -- Form -- */}
      <form onSubmit={handleSubmit} noValidate className="space-y-4">

        {/* Email */}
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">
            Alamat Email
          </label>
          <div className="relative">
            <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              autoComplete="email"
              inputMode="email"
              placeholder="email@anda.com"
              className={`w-full py-4 bg-slate-50 border rounded-2xl text-sm font-bold text-slate-900 focus:ring-2 focus:border-transparent outline-none transition-all placeholder:text-slate-300 placeholder:font-normal ${
                fieldError.email
                  ? 'border-red-300 focus:ring-red-300'
                  : 'border-slate-200 focus:ring-brand-primary'
              }`}
              style={{ paddingLeft: '3.25rem' }}
              disabled={isLocked || isLoading}
            />
          </div>
          {fieldError.email && (
            <p className="text-red-500 text-[11px] font-bold mt-1.5 ml-1">{fieldError.email}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
            <button
              type="button"
              onClick={onForgotClick}
              className="text-[10px] font-black text-brand-primary hover:text-brand-secondary transition-colors uppercase tracking-widest"
            >
              Lupa Password?
            </button>
          </div>
          <PasswordInput
            value={formData.password}
            onChange={handleChange}
            placeholder="Kata sandi Anda"
          />
          {fieldError.password && (
            <p className="text-red-500 text-[11px] font-bold mt-1.5 ml-1">{fieldError.password}</p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading || isLocked}
          className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl mt-6 flex items-center justify-center gap-2.5 hover:bg-brand-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-slate-900/10 active:scale-[0.98]"
        >
          {isLoading ? (
            <><Loader2 className="animate-spin" size={20} /> Memverifikasi...</>
          ) : isLocked ? (
            <><Clock size={20} /> Tunggu {lockSeconds}d...</>
          ) : (
            <><span>Masuk ke Akun</span> <ArrowRight size={20} /></>
          )}
        </button>
      </form>

      {/* -- Security note -- */}
      <div className="mt-5 flex items-center justify-center gap-2 text-[10px] text-slate-400 font-bold">
        <ShieldAlert size={12} />
        <span>Koneksi terenkripsi SSL. Data Anda aman.</span>
      </div>

      <div className="mt-2 text-center text-[10px] text-slate-400 font-medium px-2 leading-relaxed">
        Dengan menggunakan aplikasi ini, kamu menyetujui{' '}
        <Link to="/terms" className="text-slate-600 font-black hover:text-brand-primary">
          Syarat & Ketentuan
        </Link>{' '}
        dan{' '}
        <Link to="/privacy" className="text-slate-600 font-black hover:text-brand-primary">
          Kebijakan Privasi
        </Link>
        .
      </div>

      {/* -- Register link -- */}
      <div className="mt-6 text-center text-sm font-bold text-slate-400 pt-6 border-t border-slate-100">
        Belum punya akun?{' '}
        <Link to="/register" className="text-brand-primary hover:text-brand-secondary transition-colors">
          Daftar gratis
        </Link>
      </div>
    </div>
  );
};

export default LoginForm;
