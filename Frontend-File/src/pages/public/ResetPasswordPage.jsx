import React from 'react';
import { useResetPassword } from '../../hooks/useResetPassword';
import ResetPasswordForm from '../../components/public/auth/ResetPasswordForm';

export default function ResetPasswordPage() {
  const { token, isLoading, status, handleResetSubmit } = useResetPassword();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden font-sans text-slate-900">
      
      {/* BACKGROUND AURA */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-rose-500 rounded-full blur-[150px] opacity-10 pointer-events-none -mr-40 -mt-40"></div>
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-slate-900 rounded-full blur-[120px] opacity-5 pointer-events-none -ml-20 -mb-20"></div>

      {/* KARTU RESET PASSWORD */}
      <div className="w-full max-w-md bg-white rounded-[3rem] shadow-2xl shadow-slate-200/50 p-8 sm:p-10 relative z-10 border border-slate-100 animate-fade-in-up">
        
        <ResetPasswordForm 
          token={token}
          isLoading={isLoading}
          status={status}
          onSubmit={handleResetSubmit}
        />

      </div>
    </div>
  );
}