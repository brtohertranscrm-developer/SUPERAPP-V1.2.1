import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Phone, ShieldCheck, ArrowRight, Loader2, Mail } from 'lucide-react';
import { useAuthForm } from '../../hooks/useAuthForm';

const sanitize = (str = '') => String(str || '').trim().replace(/[<>"'`]/g, '').slice(0, 200);

export default function GoogleCompleteProfilePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { googleLoading, error, handleGoogleCompleteSubmit } = useAuthForm();

  const fromStateToken = location.state?.temp_token;
  const fromStateProfile = location.state?.profile;

  const sessionToken = useMemo(() => sessionStorage.getItem('google_complete_temp_token') || '', []);
  const sessionProfile = useMemo(() => {
    try {
      return JSON.parse(sessionStorage.getItem('google_complete_profile') || '{}');
    } catch {
      return {};
    }
  }, []);

  const tempToken = String(fromStateToken || sessionToken || '');
  const profile = fromStateProfile || sessionProfile || {};

  const [phone, setPhone] = useState('');
  const [ktpId, setKtpId] = useState('');
  const [localErr, setLocalErr] = useState('');

  useEffect(() => {
    if (!tempToken) return;
    // small hint: autofocus on phone input on first render
    const t = setTimeout(() => {
      const el = document.getElementById('google-complete-phone');
      if (el && typeof el.focus === 'function') el.focus();
    }, 50);
    return () => clearTimeout(t);
  }, [tempToken]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLocalErr('');

    const ph = sanitize(phone).replace(/\s+/g, '');
    const nik = String(ktpId || '').replace(/\D/g, '').slice(0, 16);

    if (!tempToken) {
      setLocalErr('Sesi Google kedaluwarsa. Silakan ulangi login.');
      return;
    }
    if (!ph || ph.replace(/\D/g, '').length < 10) {
      setLocalErr('Nomor HP tidak valid.');
      return;
    }
    if (nik.length !== 16) {
      setLocalErr('ID KTP (NIK) harus 16 digit angka.');
      return;
    }

    await handleGoogleCompleteSubmit({ temp_token: tempToken, phone: ph, ktp_id: nik });
  };

  if (!tempToken) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden font-sans text-slate-900">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-primary rounded-full blur-[160px] opacity-[0.05] pointer-events-none -mr-40 -mt-40" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-500 rounded-full blur-[120px] opacity-[0.05] pointer-events-none -ml-20 -mb-20" />

        <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/60 p-8 sm:p-10 relative z-10 border border-slate-100 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-brand-primary to-transparent opacity-60 rounded-t-[2.5rem]" />

          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-slate-900/20 rotate-3">
              <ShieldCheck size={28} className="text-white -rotate-3" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">Sesi Berakhir</h1>
            <p className="text-slate-500 text-sm font-medium">
              Silakan ulangi login Google untuk melanjutkan.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/login', { replace: true })}
            className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2.5 hover:bg-brand-primary transition-all shadow-xl shadow-slate-900/10 active:scale-[0.98]"
          >
            Kembali ke Login <ArrowRight size={20} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden font-sans text-slate-900">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-primary rounded-full blur-[160px] opacity-[0.05] pointer-events-none -mr-40 -mt-40" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-500 rounded-full blur-[120px] opacity-[0.05] pointer-events-none -ml-20 -mb-20" />

      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/60 p-8 sm:p-10 relative z-10 border border-slate-100 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-brand-primary to-transparent opacity-60 rounded-t-[2.5rem]" />

        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-brand-primary rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-brand-primary/30 rotate-3">
            <ShieldCheck size={28} className="text-white -rotate-3" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">Lengkapi Data Akun</h1>
          <p className="text-slate-500 text-sm font-medium">
            Supaya bisa booking & checkout, kami butuh No HP dan NIK (sekali saja).
          </p>
        </div>

        <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
          <div className="flex items-center gap-3">
            {profile?.picture ? (
              <img
                src={profile.picture}
                alt="Google profile"
                className="w-12 h-12 rounded-2xl object-cover border border-white shadow-sm"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white font-black flex items-center justify-center">
                {String(profile?.name || profile?.email || 'U').trim().slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-black text-slate-900 truncate">{profile?.name || 'Akun Google'}</p>
              <p className="text-[11px] font-bold text-slate-500 truncate flex items-center gap-1.5">
                <Mail size={13} className="shrink-0" />
                <span className="truncate">{profile?.email || '-'}</span>
              </p>
            </div>
          </div>
        </div>

        {(localErr || error) && (
          <div className="mb-4 bg-rose-50 border border-rose-200 rounded-2xl p-4 text-rose-700 text-sm font-bold">
            {localErr || error}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">
              Nomor HP / WA
            </label>
            <div className="relative">
              <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
              <input
                id="google-complete-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none transition-all"
                style={{ paddingLeft: '3.25rem' }}
                placeholder="08123456789"
                inputMode="tel"
                autoComplete="tel"
                disabled={googleLoading}
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">
              ID KTP (NIK)
            </label>
            <div className="relative">
              <ShieldCheck className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
              <input
                value={ktpId}
                onChange={(e) => setKtpId(e.target.value.replace(/\\D/g, '').slice(0, 16))}
                className="w-full py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none transition-all"
                style={{ paddingLeft: '3.25rem' }}
                placeholder="16 digit"
                inputMode="numeric"
                autoComplete="off"
                disabled={googleLoading}
              />
            </div>
            <p className="text-[10px] text-slate-400 font-medium mt-1 ml-1">
              Dipakai untuk verifikasi dan pencegahan akun bermasalah.
            </p>
          </div>

          <button
            type="submit"
            disabled={googleLoading}
            className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2.5 hover:bg-brand-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-slate-900/10 active:scale-[0.98]"
          >
            {googleLoading ? <><Loader2 className="animate-spin" size={20} /> Menyimpan...</> : <>Simpan & Lanjut <ArrowRight size={20} /></>}
          </button>
        </form>
      </div>
    </div>
  );
}

