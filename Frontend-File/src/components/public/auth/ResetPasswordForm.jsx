import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, CheckCircle2, AlertCircle, Loader2, KeyRound, ShieldCheck } from 'lucide-react';

const ResetPasswordForm = ({ token, isLoading, status, onSubmit }) => {
  const [formData, setFormData] = useState({ newPassword: '', confirmPassword: '' });

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData.newPassword, formData.confirmPassword);
  };

  return (
    <div className="animate-fade-in-up">
      
      {/* HEADER KARTU */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-slate-900 text-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-slate-900/20 transform -rotate-3">
          <KeyRound size={32} className="text-rose-500" />
        </div>
        <h1 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">Buat Sandi Baru</h1>
        <p className="text-slate-500 text-sm font-medium">Buat kata sandi baru yang kuat dan mudah Anda ingat.</p>
      </div>

      {/* NOTIFIKASI STATUS */}
      {status.message && (
        <div className={`mb-6 p-4 rounded-2xl text-sm font-bold flex items-start gap-3 border ${status.type === 'success' ? 'bg-green-50 text-green-600 border-green-100 shadow-sm' : 'bg-red-50 text-red-600 border-red-100'}`}>
          {status.type === 'success' ? <CheckCircle2 size={20} className="shrink-0 mt-0.5" /> : <AlertCircle size={20} className="shrink-0 mt-0.5" />}
          <p>{status.message}</p>
        </div>
      )}

      {/* JIKA TOKEN TIDAK ADA, TAMPILKAN TOMBOL KEMBALI */}
      {!token ? (
        <div className="text-center mt-8">
          <Link to="/login" className="inline-flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-rose-500 transition-colors">
            Kembali ke Login
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Input Password Baru */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Kata Sandi Baru</label>
            <div className="relative">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="password" name="newPassword" required
                value={formData.newPassword} onChange={handleChange} disabled={status.type === 'success'}
                className="w-full pl-14 pr-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-rose-500 outline-none transition-all placeholder:text-slate-300 disabled:opacity-50"
                placeholder="Minimal 6 karakter"
              />
            </div>
          </div>

          {/* Input Konfirmasi Password */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Ulangi Kata Sandi</label>
            <div className="relative">
              <ShieldCheck className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="password" name="confirmPassword" required
                value={formData.confirmPassword} onChange={handleChange} disabled={status.type === 'success'}
                className="w-full pl-14 pr-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-rose-500 outline-none transition-all placeholder:text-slate-300 disabled:opacity-50"
                placeholder="Ketik ulang sandi"
              />
            </div>
          </div>

          {/* Tombol Submit */}
          <button 
            type="submit" disabled={isLoading || status.type === 'success'}
            className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl mt-8 flex items-center justify-center gap-2 hover:bg-rose-500 transition-all disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed shadow-xl shadow-slate-900/10 active:scale-95"
          >
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Simpan Sandi Baru'} 
          </button>
        </form>
      )}
    </div>
  );
};

export default ResetPasswordForm;