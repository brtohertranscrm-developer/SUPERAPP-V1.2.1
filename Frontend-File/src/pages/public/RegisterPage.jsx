import React, { useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { useAuthForm } from '../../hooks/useAuthForm';
import RegisterForm from '../../components/public/auth/RegisterForm';

export default function RegisterPage() {
  const { user }    = useContext(AuthContext) || {};
  const navigate    = useNavigate();
  const { isLoading, error, handleRegisterSubmit } = useAuthForm();

  // ── Jika sudah login, jangan tampilkan halaman register ────────────────────
  useEffect(() => {
    if (!user) return;
    const role = user.role;
    if (role === 'admin' || role === 'superadmin' || role === 'subadmin') {
      navigate('/admin', { replace: true });
    } else {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden font-sans text-slate-900">

      {/* ── Background aura ── */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-primary rounded-full blur-[160px] opacity-[0.05] pointer-events-none -mr-40 -mt-40" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-500 rounded-full blur-[120px] opacity-[0.05] pointer-events-none -ml-20 -mb-20" />
      <div className="absolute top-0 left-0 w-px h-full bg-gradient-to-b from-transparent via-slate-200 to-transparent opacity-60 pointer-events-none" style={{ left: '30%' }} />

      {/* ── Kartu utama ── */}
      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/60 p-8 sm:p-10 relative z-10 border border-slate-100 overflow-hidden">

        {/* Subtle top accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-brand-primary to-transparent opacity-60 rounded-t-[2.5rem]" />

        <RegisterForm
          isLoading={isLoading}
          error={error}
          onSubmit={handleRegisterSubmit}
        />
      </div>

      {/* ── Footer branding ── */}
      <p className="absolute bottom-6 left-0 right-0 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
        Brother Trans © {new Date().getFullYear()} · Jogja & Solo
      </p>
    </div>
  );
}
