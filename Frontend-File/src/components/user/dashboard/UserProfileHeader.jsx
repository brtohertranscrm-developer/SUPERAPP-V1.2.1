import React, { useRef } from 'react';
import { Camera, CheckCircle2, Edit3 } from 'lucide-react';

const UserProfileHeader = ({ user, bannerUrl, setBannerUrl, kycStatus, updateBanner, onEditClick }) => {
  const fileInputRef = useRef(null);

  const handleBannerChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result;
        setBannerUrl(base64String); 
        await updateBanner(base64String);
      };
      reader.readAsDataURL(file); 
    }
  };

  return (
    <div className="relative bg-slate-950 pt-24 pb-48 px-4 overflow-hidden bg-cover bg-center transition-all duration-500 ease-in-out" style={{ backgroundImage: `url(${bannerUrl})` }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"></div>
      <input type="file" ref={fileInputRef} onChange={handleBannerChange} accept="image/*" className="hidden" />
      
      <div className="max-w-6xl mx-auto relative z-10 animate-fade-in-up">
        <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 sm:p-8 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col md:flex-row items-center text-center md:text-left gap-6">
            <div className="relative group shrink-0">
              <div className="absolute -inset-1.5 bg-gradient-to-r from-rose-500 to-amber-400 rounded-full blur opacity-60 group-hover:opacity-100 transition duration-500"></div>
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 bg-slate-800 rounded-full border-4 border-slate-950 flex items-center justify-center text-4xl sm:text-5xl font-black text-white shadow-xl overflow-hidden z-10 cursor-pointer" onClick={() => fileInputRef.current.click()} title="Ubah Foto Profil">
                {user?.profile_picture ? <img src={user.profile_picture} alt={user?.name} className="w-full h-full object-cover" /> : (user?.name ? user.name.charAt(0).toUpperCase() : 'U')}
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Camera size={24} className="text-white" /></div>
              </div>
              
              {kycStatus === 'verified' && (
                <div className="absolute bottom-1 right-1 w-8 h-8 bg-blue-500 rounded-full border-[3px] border-slate-900 flex items-center justify-center text-white shadow-[0_0_15px_rgba(59,130,246,0.5)] z-20">
                  <CheckCircle2 size={16} strokeWidth={3} className="text-white" />
                </div>
              )}
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-2 drop-shadow-md">Halo, {user?.name || 'Brother'}</h1>
              <div className="flex flex-wrap justify-center md:justify-start items-center gap-2.5">
                <span className="text-slate-200 text-xs sm:text-sm font-medium bg-black/30 px-3 py-1.5 rounded-lg border border-white/5">{user?.email}</span>
                <span className="text-slate-400 hidden md:inline">|</span>
                <span className="text-slate-200 text-xs sm:text-sm font-medium bg-black/30 px-3 py-1.5 rounded-lg border border-white/5">{user?.phone || 'No HP Belum Diatur'}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <button onClick={() => fileInputRef.current.click()} className="px-5 py-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-xs font-bold text-white transition-colors flex items-center justify-center gap-2 backdrop-blur-md"><Camera size={16} /> Ubah Banner Travel</button>
            <button onClick={onEditClick} className="px-5 py-3 bg-white text-slate-900 hover:bg-slate-100 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-lg"><Edit3 size={16} /> Edit Profil</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfileHeader;