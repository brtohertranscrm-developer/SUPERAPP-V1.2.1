import React, { useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  User, Mail, Lock, Phone, ArrowRight, Loader2, AlertCircle,
  Eye, EyeOff, Gift, CheckCircle2, XCircle, ShieldCheck, ExternalLink
} from 'lucide-react';
const sanitize = (str = '') => str.replace(/[<>"'`]/g, '').slice(0, 500);
const isValidEmail = (v = '') => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
const formatPhone = (v = '') => { const d = v.replace(/\D/g, ''); if (d.startsWith('08')) return '628' + d.slice(2); if (d.startsWith('8')) return '62' + d; return d; };
const passwordStrength = (p = '') => { let s = 0; if (p.length >= 8) s++; if (/[A-Z]/.test(p)) s++; if (/[0-9]/.test(p)) s++; if (/[^A-Za-z0-9]/.test(p)) s++; return s; };

const API_URL = import.meta.env.VITE_API_URL || '';

// --- Password Input dengan peek -----------------------------------------------
const PasswordInput = ({ value, onChange, name = 'password', placeholder = 'Minimal 6 karakter', autoComplete = 'new-password' }) => {
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
        className="w-full py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none transition-all placeholder:text-slate-300 placeholder:font-normal"
        style={{ paddingLeft: '3.25rem', paddingRight: '3rem' }}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors focus:outline-none"
        aria-label={show ? 'Sembunyikan password' : 'Tampilkan password'}
        tabIndex={-1}
      >
        {show ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </div>
  );
};

// --- Password Strength Bar ----------------------------------------------------
const StrengthBar = ({ password }) => {
  if (!password) return null;
  const { score, label, color } = passwordStrength(password);
  const bars = [1, 2, 3, 4];
  return (
    <div className="mt-2 px-1">
      <div className="flex gap-1 mb-1">
        {bars.map((b) => (
          <div
            key={b}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${b <= score ? color : 'bg-slate-200'}`}
          />
        ))}
      </div>
      {label && (
        <p className={`text-[10px] font-black ml-0.5 ${
          score <= 1 ? 'text-red-500' : score === 2 ? 'text-amber-500' : score === 3 ? 'text-blue-500' : 'text-green-600'
        }`}>
          Kekuatan: {label}
          {score < 3 && <span className="font-normal text-slate-400 ml-1">-- tambahkan huruf besar, angka, atau simbol</span>}
        </p>
      )}
    </div>
  );
};

// --- Referral Input dengan validasi realtime ----------------------------------
const ReferralInput = ({ value, onChange }) => {
  const [validation, setValidation] = useState({ status: 'idle', message: '' });
  const timerRef = useRef(null);

  const handleChange = (e) => {
    const code = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    onChange({ target: { name: 'referred_by', value: code } });

    if (timerRef.current) clearTimeout(timerRef.current);
    if (!code || code.length < 4) { setValidation({ status: 'idle', message: '' }); return; }

    setValidation({ status: 'checking', message: '' });
    timerRef.current = setTimeout(async () => {
      try {
        const res    = await fetch(`${API_URL}/api/auth/referral/validate?code=${encodeURIComponent(code)}`);
        const result = await res.json();
        if (result.success) {
          setValidation({ status: 'valid', message: `Kode valid! Kamu & ${result.referrer_name} masing-masing dapat Miles gratis.` });
        } else {
          setValidation({ status: 'invalid', message: 'Kode referral tidak ditemukan.' });
        }
      } catch {
        setValidation({ status: 'idle', message: '' });
      }
    }, 600);
  };

  const cfg = {
    idle:     { border: 'border-indigo-100', bg: 'bg-indigo-50/40', ring: 'focus:ring-indigo-400' },
    checking: { border: 'border-indigo-200', bg: 'bg-indigo-50/40', ring: 'focus:ring-indigo-400' },
    valid:    { border: 'border-green-300',  bg: 'bg-green-50/50',  ring: 'focus:ring-green-400'  },
    invalid:  { border: 'border-red-300',    bg: 'bg-red-50/40',    ring: 'focus:ring-red-400'    },
  }[validation.status];

  return (
    <div>
      <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2 block ml-1">
        Kode Referral <span className="text-slate-400 font-normal normal-case">(Opsional -- dapat Miles gratis!)</span>
      </label>
      <div className="relative">
        <Gift className={`absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none ${
          validation.status === 'valid' ? 'text-green-500' : validation.status === 'invalid' ? 'text-red-400' : 'text-indigo-400'
        }`} size={18} />
        <input
          type="text"
          name="referred_by"
          value={value}
          onChange={handleChange}
          maxLength={20}
          placeholder="BR-NAMA-123"
          autoComplete="off"
          spellCheck={false}
          className={`w-full py-4 ${cfg.bg} border ${cfg.border} rounded-2xl text-sm font-bold text-slate-900 focus:ring-2 ${cfg.ring} focus:border-transparent outline-none transition-all placeholder:text-slate-300 uppercase`}
          style={{ paddingLeft: '3.25rem', paddingRight: '3rem' }}
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          {validation.status === 'checking' && <Loader2 size={16} className="text-indigo-400 animate-spin" />}
          {validation.status === 'valid'    && <CheckCircle2 size={16} className="text-green-500" />}
          {validation.status === 'invalid'  && <XCircle size={16} className="text-red-400" />}
        </div>
      </div>
      {validation.status === 'valid' && (
        <div className="mt-2 flex items-start gap-2 bg-green-50 border border-green-100 rounded-xl px-3 py-2.5">
          <CheckCircle2 size={13} className="text-green-500 shrink-0 mt-0.5" />
          <p className="text-[11px] font-bold text-green-700">{validation.message}</p>
        </div>
      )}
      {validation.status === 'invalid' && (
        <div className="mt-2 flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
          <XCircle size={13} className="text-red-400 shrink-0 mt-0.5" />
          <p className="text-[11px] font-bold text-red-600">{validation.message}</p>
        </div>
      )}
    </div>
  );
};

// --- FieldErr -----------------------------------------------------------------
const FieldErr = ({ msg }) =>
  msg ? <p className="text-red-500 text-[11px] font-bold mt-1.5 ml-1">{msg}</p> : null;

const LegalConsent = ({ checked, onChange, error }) => {
  return (
    <div className="pt-1">
      <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-1 w-4 h-4 accent-rose-600"
        />
        <div className="min-w-0">
          <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
            Saya sudah membaca dan menyetujui{' '}
            <Link
              to="/terms"
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-slate-900 font-black underline underline-offset-2 hover:text-brand-primary inline-flex items-center gap-1"
              title="Buka Syarat & Ketentuan"
            >
              Syarat & Ketentuan <ExternalLink size={12} />
            </Link>{' '}
            serta{' '}
            <Link
              to="/privacy"
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-slate-900 font-black underline underline-offset-2 hover:text-brand-primary inline-flex items-center gap-1"
              title="Buka Kebijakan Privasi"
            >
              Kebijakan Privasi <ExternalLink size={12} />
            </Link>
            .
          </p>
          {error ? <p className="text-red-500 text-[11px] font-bold mt-2">{error}</p> : null}
        </div>
      </label>
    </div>
  );
};

// --- Komponen utama -----------------------------------------------------------
const RegisterForm = ({ isLoading, error, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', ktp_id: '', password: '', referred_by: '',
  });
  const [fieldError, setFieldError] = useState({});
  const [submitted,  setSubmitted]  = useState(false);
  const [acceptLegal, setAcceptLegal] = useState(false);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
    if (fieldError[name]) setFieldError((p) => ({ ...p, [name]: '' }));
  }, [fieldError]);

  const validate = () => {
    const errs = {};
    if (sanitize(formData.name).length < 2)                errs.name     = 'Nama minimal 2 karakter.';
    if (!isValidEmail(sanitize(formData.email)))           errs.email    = 'Format email tidak valid.';
    const ph = formatPhone(formData.phone);
    if (!ph || ph.length < 10 || ph.length > 15)          errs.phone    = 'Nomor HP tidak valid (10-15 digit).';
    const ktp = String(formData.ktp_id || '').replace(/\D/g, '');
    if (ktp.length !== 16)                                 errs.ktp_id   = 'ID KTP (NIK) harus 16 digit angka.';
    if (!formData.password || formData.password.length < 6) errs.password = 'Password minimal 6 karakter.';
    if (!acceptLegal)                                      errs.legal    = 'Centang persetujuan untuk melanjutkan.';
    setFieldError(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (submitted || isLoading) return;
    if (!validate()) return;
    setSubmitted(true);

    const promise = onSubmit({
      name:        sanitize(formData.name),
      email:       sanitize(formData.email).toLowerCase(),
      phone:       formatPhone(formData.phone),
      ktp_id:      String(formData.ktp_id || '').replace(/\D/g, ''),
      password:    formData.password,
      referred_by: formData.referred_by || undefined,
    });

    if (promise && typeof promise.then === 'function') {
      promise.then((ok) => { if (!ok) setSubmitted(false); }).catch(() => setSubmitted(false));
    } else {
      setTimeout(() => setSubmitted(false), 4000);
    }
  };

  return (
    <div className="animate-fade-in-up w-full">
      {/* Header */}
      <div className="text-center mb-7">
        <h1 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">Buat Akun Baru</h1>
        <p className="text-slate-500 text-sm font-medium">Bergabung dan mulai perjalanan bersama Brother Trans hari ini.</p>
      </div>

      {/* Error global */}
      {error && (
        <div className="mb-5 bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-bold flex items-start gap-3 border border-red-100">
          <AlertCircle size={20} className="shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Nama */}
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Nama Lengkap</label>
          <div className="relative">
            <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
            <input
              type="text" name="name" value={formData.name} onChange={handleChange}
              autoComplete="name" placeholder="Bima Sena"
              className={`w-full py-4 bg-slate-50 border rounded-2xl text-sm font-bold text-slate-900 focus:ring-2 focus:border-transparent outline-none transition-all placeholder:text-slate-300 placeholder:font-normal ${fieldError.name ? 'border-red-300 focus:ring-red-300' : 'border-slate-200 focus:ring-brand-primary'}`}
              style={{ paddingLeft: '3.25rem' }}
            />
          </div>
          <FieldErr msg={fieldError.name} />
        </div>

        {/* Email */}
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Email</label>
          <div className="relative">
            <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
            <input
              type="email" name="email" value={formData.email} onChange={handleChange}
              autoComplete="email" inputMode="email" placeholder="bima@email.com"
              className={`w-full py-4 bg-slate-50 border rounded-2xl text-sm font-bold text-slate-900 focus:ring-2 focus:border-transparent outline-none transition-all placeholder:text-slate-300 placeholder:font-normal ${fieldError.email ? 'border-red-300 focus:ring-red-300' : 'border-slate-200 focus:ring-brand-primary'}`}
              style={{ paddingLeft: '3.25rem' }}
            />
          </div>
          <FieldErr msg={fieldError.email} />
        </div>

        {/* Phone */}
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Nomor HP / WA</label>
          <div className="relative">
            <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
            <input
              type="tel" name="phone" value={formData.phone} onChange={handleChange}
              autoComplete="tel" inputMode="tel" placeholder="08123456789"
              className={`w-full py-4 bg-slate-50 border rounded-2xl text-sm font-bold text-slate-900 focus:ring-2 focus:border-transparent outline-none transition-all placeholder:text-slate-300 placeholder:font-normal ${fieldError.phone ? 'border-red-300 focus:ring-red-300' : 'border-slate-200 focus:ring-brand-primary'}`}
              style={{ paddingLeft: '3.25rem' }}
            />
          </div>
          <FieldErr msg={fieldError.phone} />
        </div>

        {/* KTP / NIK */}
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">ID KTP (NIK)</label>
          <div className="relative">
            <ShieldCheck className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
            <input
              type="text"
              name="ktp_id"
              value={formData.ktp_id}
              onChange={(e) => handleChange({ target: { name: 'ktp_id', value: e.target.value.replace(/\\D/g, '').slice(0, 16) } })}
              inputMode="numeric"
              autoComplete="off"
              placeholder="16 digit"
              className={`w-full py-4 bg-slate-50 border rounded-2xl text-sm font-bold text-slate-900 focus:ring-2 focus:border-transparent outline-none transition-all placeholder:text-slate-300 placeholder:font-normal ${fieldError.ktp_id ? 'border-red-300 focus:ring-red-300' : 'border-slate-200 focus:ring-brand-primary'}`}
              style={{ paddingLeft: '3.25rem' }}
            />
          </div>
          <FieldErr msg={fieldError.ktp_id} />
          <p className="text-[10px] text-slate-400 font-medium mt-1 ml-1">
            Dipakai untuk pencocokan saat verifikasi dan pencegahan akun bermasalah.
          </p>
        </div>

        {/* Password + strength */}
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Password</label>
          <PasswordInput value={formData.password} onChange={handleChange} />
          <StrengthBar password={formData.password} />
          <FieldErr msg={fieldError.password} />
        </div>

        {/* Referral */}
        <ReferralInput value={formData.referred_by} onChange={handleChange} />

        <LegalConsent
          checked={acceptLegal}
          onChange={(v) => {
            setAcceptLegal(v);
            if (fieldError.legal) setFieldError((p) => ({ ...p, legal: '' }));
          }}
          error={fieldError.legal}
        />

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading || submitted}
          className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2.5 hover:bg-brand-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-slate-900/10 active:scale-[0.98]"
        >
          {isLoading || submitted
            ? <><Loader2 className="animate-spin" size={20} /> Mendaftarkan Akun...</>
            : <><span>Daftar Sekarang</span> <ArrowRight size={20} /></>
          }
        </button>
      </form>

      {/* Security note */}
      <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-bold">
        <ShieldCheck size={12} className="text-green-500" />
        <span>Data Anda dienkripsi dan tidak pernah dijual.</span>
      </div>

      {/* Login link */}
      <div className="mt-6 text-center text-sm font-bold text-slate-400 pt-5 border-t border-slate-100">
        Sudah punya akun?{' '}
        <Link to="/login" className="text-brand-primary hover:text-brand-secondary transition-colors">
          Masuk di sini
        </Link>
      </div>
    </div>
  );
};

export default RegisterForm;
