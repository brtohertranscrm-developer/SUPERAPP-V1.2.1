import React, { useState, useContext, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { CheckCircle2 } from 'lucide-react';
import { useAuthForm } from '../../hooks/useAuthForm';
import LoginForm from '../../components/public/auth/LoginForm';
import ForgotPasswordForm from '../../components/public/auth/ForgotPasswordForm';

export default function LoginPage() {
  const { user } = useContext(AuthContext) || {};
  const navigate  = useNavigate();
  const location  = useLocation();

  const {
    isLoading, error, forgotStatus, setForgotStatus,
    lockSeconds,
    handleLoginSubmit, handleForgotPasswordSubmit,
  } = useAuthForm();

  const [isForgotMode, setIsForgotMode] = useState(false);

  // ── Jika sudah login, redirect sesuai role ──────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const role = user.role;
    if (role === 'admin' || role === 'superadmin' || role === 'subadmin') {
      navigate('/admin', { replace: true });
    } else {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  // ── Pesan sukses dari halaman register ─────────────────────────────────────
  const registeredSuccess = location.state?.registered;
  const registeredEmail   = location.state?.email;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden font-sans text-slate-900">

      {/* ── Background aura ── */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-brand-primary rounded-full blur-[160px] opacity-[0.06] pointer-events-none -ml-40 -mt-40" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-slate-900 rounded-full blur-[120px] opacity-[0.04] pointer-events-none -mr-20 -mb-20" />
      {/* Diagonal accent line */}
      <div className="absolute top-0 right-0 w-px h-full bg-gradient-to-b from-transparent via-slate-200 to-transparent opacity-60 pointer-events-none" style={{ right: '30%' }} />

      {/* ── Kartu utama ── */}
      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/60 p-8 sm:p-10 relative z-10 border border-slate-100 overflow-hidden">

        {/* Subtle top accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-brand-primary to-transparent opacity-60 rounded-t-[2.5rem]" />

        {/* ── Banner sukses register ── */}
        {registeredSuccess && (
          <div className="mb-6 bg-green-50 border border-green-100 rounded-2xl p-4 flex items-start gap-3">
            <CheckCircle2 size={20} className="text-green-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-black text-green-800 text-sm">Akun berhasil dibuat!</p>
              {registeredEmail && (
                <p className="text-green-700 text-xs font-medium mt-0.5">
                  Silakan login dengan email <span className="font-bold">{registeredEmail}</span>
                </p>
              )}
            </div>
          </div>
        )}

        {isForgotMode ? (
          <ForgotPasswordForm
            isLoading={isLoading}
            status={forgotStatus}
            setStatus={setForgotStatus}
            onSubmit={handleForgotPasswordSubmit}
            onBackClick={() => { setIsForgotMode(false); setForgotStatus({ type: '', message: '' }); }}
          />
        ) : (
          <LoginForm
            isLoading={isLoading}
            error={error}
            lockSeconds={lockSeconds}
            onSubmit={handleLoginSubmit}
            onForgotClick={() => setIsForgotMode(true)}
          />
        )}
      </div>

      {/* ── Footer branding ── */}
      <p className="absolute bottom-6 left-0 right-0 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
        Brother Trans © {new Date().getFullYear()} · Jogja & Solo
      </p>
    </div>
  );
}
