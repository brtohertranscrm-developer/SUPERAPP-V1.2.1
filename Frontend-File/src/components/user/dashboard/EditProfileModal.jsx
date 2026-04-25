import React from 'react';
import { Edit3, Loader2, User, X } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function EditProfileModal({
  isOpen,
  onClose,
  userEmail,
  editForm,
  setEditForm,
  isSavingProfile,
  onSubmit,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden animate-fade-in-up">
        <div className="bg-slate-50 border-b border-slate-100 px-6 py-5 flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Edit3 size={18} className="text-rose-500" /> Edit Profil
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <form onSubmit={onSubmit} className="p-6">
          <div className="mb-4">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
              Email Akun
            </label>
            <div className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-sm font-medium text-slate-500 flex items-center gap-2 cursor-not-allowed">
              <User size={16} /> {userEmail}
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
              Nama Lengkap
            </label>
            <input
              type="text"
              required
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-slate-900 outline-none"
            />
          </div>
          <div className="mb-4">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
              Nomor WhatsApp
            </label>
            <input
              type="text"
              required
              value={editForm.phone}
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-slate-900 outline-none"
            />
          </div>
          <div className="mb-4">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
              Domisili / Lokasi
            </label>
            <div className="relative">
              <select
                value={editForm.location}
                onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-slate-900 outline-none appearance-none cursor-pointer"
              >
                <option value="Yogyakarta">Yogyakarta</option>
                <option value="Solo">Solo</option>
                <option value="Lainnya">Lainnya</option>
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 font-black">
                ▼
              </div>
            </div>
          </div>
          <div className="mb-6">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
              Password Baru
            </label>
            <input
              type="password"
              placeholder="Kosongkan jika tak ingin diubah"
              value={editForm.password}
              onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={isSavingProfile}
            className="w-full bg-slate-900 hover:bg-rose-500 text-white font-black py-4 rounded-xl text-sm transition-all shadow-lg active:scale-95 flex justify-center items-center gap-2"
          >
            {isSavingProfile ? <Loader2 className="animate-spin" size={18} /> : 'Simpan Perubahan'}
          </button>

          <div className="mt-4 text-center text-[10px] text-slate-400 font-bold">
            <Link to="/terms" className="hover:text-slate-900">Syarat & Ketentuan</Link>
            <span className="mx-2 text-slate-300">•</span>
            <Link to="/privacy" className="hover:text-slate-900">Kebijakan Privasi</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
