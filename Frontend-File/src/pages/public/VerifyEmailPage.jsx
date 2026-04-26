import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Mail, ShieldCheck, Loader2, RefreshCw } from 'lucide-react';
import { API_BASE_URL } from '../../utils/api';

const sanitize = (str = '') => String(str || '').trim().replace(/[<>"'`]/g, '').slice(0, 200);
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email || '').trim());

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const stateEmail = location.state?.email;
  const queryEmail = useMemo(() => {
    try {
      const u = new URL(window.location.href);
      return u.searchParams.get('email');
    } catch {
      return null;
    }
  }, []);

  const [email, setEmail] = useState(sanitize(stateEmail || queryEmail || ''));
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const API_URL = API_BASE_URL;

  useEffect(() => {
    if (!email) return;
    if (!isValidEmail(email)) return;
    // Start small cooldown UI to prevent spam clicks; backend already enforces.
    setCooldown(60);
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const requestOtp = async () => {
    setError('');
    setInfo('');
    const e = sanitize(email).toLowerCase();
    if (!isValidEmail(e)) {
      setError('Email tidak valid.');
      return;
    }
    setIsSending(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/email-otp/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({ email: e }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok || !result?.success) {
        setError(result?.error || 'Gagal mengirim OTP.');
      } else {
        setInfo(result?.message || 'OTP terkirim.');
        setCooldown(60);
      }
    } catch {
      setError('Gagal terhubung ke server.');
    } finally {
      setIsSending(false);
    }
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    const mail = sanitize(email).toLowerCase();
    const otp = String(code || '').replace(/\D/g, '').slice(0, 6);
    if (!isValidEmail(mail)) return setError('Email tidak valid.');
    if (otp.length !== 6) return setError('Kode OTP harus 6 digit.');

    setIsVerifying(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/email-otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({ email: mail, code: otp }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok || !result?.success) {
        setError(result?.error || 'OTP salah atau sudah kedaluwarsa.');
      } else {
        navigate('/login', { state: { verified: true, email: mail }, replace: true });
      }
    } catch {
      setError('Gagal terhubung ke server.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden font-sans text-slate-900">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-primary rounded-full blur-[160px] opacity-[0.05] pointer-events-none -mr-40 -mt-40" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-500 rounded-full blur-[120px] opacity-[0.05] pointer-events-none -ml-20 -mb-20" />

      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/60 p-8 sm:p-10 relative z-10 border border-slate-100 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-brand-primary to-transparent opacity-60 rounded-t-[2.5rem]" />

        <div className="text-center mb-7">
          <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-slate-900/20 rotate-3">
            <ShieldCheck size={28} className="text-white -rotate-3" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">Verifikasi Email</h1>
          <p className="text-slate-500 text-sm font-medium">
            Masukkan kode OTP yang kami kirim ke email kamu untuk bisa login.
          </p>
        </div>

        <div className="mb-4">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
            <input
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); setInfo(''); }}
              className="w-full py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none transition-all"
              style={{ paddingLeft: '3.25rem' }}
              placeholder="email@anda.com"
              inputMode="email"
            />
          </div>
        </div>

        <form onSubmit={verifyOtp} className="space-y-4">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">
              Kode OTP (6 digit)
            </label>
            <input
              value={code}
              onChange={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); setInfo(''); }}
              className="w-full px-4 py-4 bg-white border border-slate-200 rounded-2xl text-lg font-black tracking-[0.45em] text-center focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
              placeholder="••••••"
              inputMode="numeric"
              autoComplete="one-time-code"
            />
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-rose-700 text-sm font-bold">
              {error}
            </div>
          )}
          {info && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-emerald-800 text-sm font-bold">
              {info}
            </div>
          )}

          <button
            type="submit"
            disabled={isVerifying}
            className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2.5 hover:bg-brand-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-slate-900/10 active:scale-[0.98]"
          >
            {isVerifying ? <><Loader2 className="animate-spin" size={20} /> Memverifikasi...</> : 'Verifikasi & Login'}
          </button>

          <button
            type="button"
            onClick={requestOtp}
            disabled={isSending || cooldown > 0}
            className="w-full bg-white border border-slate-200 text-slate-700 font-black py-3.5 rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSending ? <><Loader2 className="animate-spin" size={18} /> Mengirim...</> : <><RefreshCw size={18} /> Kirim Ulang OTP {cooldown > 0 ? `(${cooldown}s)` : ''}</>}
          </button>
        </form>

        <p className="text-center text-[10px] font-medium text-slate-400 mt-5">
          Cek juga folder Spam/Promosi jika OTP tidak masuk.
        </p>
      </div>
    </div>
  );
}

