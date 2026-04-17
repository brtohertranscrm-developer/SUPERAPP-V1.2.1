import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useUserDashboard } from '../../hooks/useUserDashboard';
import UserProfileHeader from '../../components/user/dashboard/UserProfileHeader';
import ActiveBookingCard from '../../components/user/dashboard/ActiveBookingCard';
import UserStats from '../../components/user/dashboard/UserStats';
import KycStatus from '../../components/user/kyc/KycStatus';
import ArticleSidebar from '../../components/user/dashboard/ArticleSidebar';

// IMPORT KOMPONEN GAMIFIKASI BARU
import MissionBanner from '../../components/user/dashboard/MissionBanner';
import TCOnboardingModal from '../../components/user/dashboard/TCOnboardingModal';

// Icon imports
import { Trophy, Gift, Navigation, MapPin, ChevronRight, Headset, MessageCircle, LifeBuoy, X, User, Edit3, Copy } from 'lucide-react';

export default function Dashboard() {
  // PASTIKAN 'navigate' ADA DI SINI
  const {
    isLoading, kycStatus, bannerUrl, setBannerUrl, topTravellers,
    user, activeOrder, saveProfile, updateBanner, navigate, verifyKycCode, handleExtend
  } = useUserDashboard();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  
  // STATE GAMIFIKASI
  const [showTCOnboarding, setShowTCOnboarding] = useState(false);
  
  // Cek apakah user sudah pernah menyelesaikan misi dari database (jika ada flag-nya), default false
  const [hasCompletedMission, setHasCompletedMission] = useState(
    user?.has_completed_tc_gamification === 1 || user?.has_completed_tc_gamification === true
  );

  React.useEffect(() => {
    if (user?.has_completed_tc_gamification === 1 || user?.has_completed_tc_gamification === true) {
      setHasCompletedMission(true);
    }
  }, [user]);
  
  // Tambahkan 'location' ke dalam state awal editForm
  const [editForm, setEditForm] = useState({ 
    name: user?.name || '', 
    phone: user?.phone || '', 
    location: user?.location || 'Lainnya', 
    password: '' 
  });

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-rose-500" size={40} /></div>;

  const currentMiles = user?.miles || 0;

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSavingProfile(true);
    const success = await saveProfile(editForm);
    if (success) {
      alert('Profil berhasil diperbarui.');
      setIsEditModalOpen(false);
    } else {
      alert('Gagal menyimpan profil');
    }
    setIsSavingProfile(false);
  };

  // HANDLER KETIKA MISI SELESAI
  const handleClaimSuccess = () => {
    setShowTCOnboarding(false);
    setHasCompletedMission(true);
    window.location.reload(); // Refresh untuk menarik saldo Miles & state terbaru
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans text-slate-900 relative">
      
      {/* 1. Header Profil & Foto */}
      <UserProfileHeader 
        user={user} bannerUrl={bannerUrl} setBannerUrl={setBannerUrl} 
        kycStatus={kycStatus} updateBanner={updateBanner} onEditClick={() => setIsEditModalOpen(true)}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20 -mt-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* ========================================= */}
          {/* BAGIAN KIRI / UTAMA */}
          {/* ========================================= */}
          <div className="lg:col-span-8 space-y-8">

            {/* BANNER GAMIFIKASI */}
            {!hasCompletedMission && (
              <MissionBanner onClick={() => setShowTCOnboarding(true)} />
            )}
            
            {/* Status KYC */}
            {kycStatus !== 'verified' && (
              <KycStatus status={kycStatus} verifyKycCode={verifyKycCode} /> 
            )}

            {/* Pesanan Aktif */}
            <ActiveBookingCard order={activeOrder} navigate={navigate} handleExtend={handleExtend} />

            {/* Status Miles */}
            <UserStats currentMiles={currentMiles} navigate={navigate} />

            {/* Kotak Promo Ajak Teman */}
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[2rem] p-6 sm:p-8 text-white relative overflow-hidden flex flex-col sm:flex-row justify-between items-center sm:items-end shadow-sm gap-6">
              <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
              <div className="relative z-10 w-full sm:w-auto text-center sm:text-left">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/20 mb-4 mx-auto sm:mx-0"><Gift size={20} /></div>
                <h3 className="text-xl sm:text-2xl font-black mb-1 leading-tight drop-shadow-sm">Ajak Teman,<br/>Dapat Cuan!</h3>
                <p className="text-indigo-100 text-xs sm:text-sm font-medium leading-relaxed max-w-xs mx-auto sm:mx-0">Dapatkan 50 Miles setiap teman mendaftar pakai kode Anda.</p>
              </div>
              <button onClick={() => {navigator.clipboard.writeText(user.referral_code || ''); alert('Kode tersalin!');}} className="w-full sm:w-auto px-8 py-4 bg-white text-indigo-600 font-black rounded-xl text-sm flex items-center justify-center gap-2 hover:scale-105 transition-transform shadow-xl relative z-10 whitespace-nowrap">
                <Copy size={18}/> Salin Kode
              </button>
            </div>
            
          </div>

          {/* ========================================= */}
          {/* BAGIAN KANAN / SIDEBAR */}
          {/* ========================================= */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Top Traveller */}
            <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-100">
              <h3 className="text-sm font-black text-slate-900 mb-4 uppercase tracking-widest flex items-center gap-2"><Trophy size={16} className="text-amber-500"/> Top Traveller</h3>
              <div className="space-y-4">
                {topTravellers.length > 0 ? (
                  topTravellers.map((member, i) => {
                    const colors = ['bg-amber-100 text-amber-700', 'bg-slate-100 text-slate-600', 'bg-orange-100 text-orange-700'];
                    return (
                      <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${colors[i] || colors[1]}`}>#{i + 1}</div>
                          <span className="font-bold text-sm text-slate-900">{member.name}</span>
                        </div>
                        <span className="text-xs font-black text-rose-500">{member.miles} Miles</span>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center p-6 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                    <Trophy size={32} className="text-slate-300 mb-3 mx-auto" />
                    <h4 className="text-sm font-black text-slate-900 mb-1">Takhta Masih Kosong!</h4>
                    <button onClick={() => navigate('/motor')} className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-rose-500 transition-colors">Mulai Petualangan</button>
                  </div>
                )}
              </div>
            </div>

            {/* ---> WIDGET ARTIKEL DITAMBAHKAN DI SINI <--- */}
            <ArticleSidebar navigate={navigate} />

            {/* Menu Cepat */}
            <div className="bg-white rounded-[2.5rem] p-4 shadow-sm border border-slate-100 flex flex-col gap-2">
              <button onClick={() => navigate('/trip-history')} className="flex items-center justify-between p-4 bg-white hover:bg-slate-50 rounded-2xl transition-colors group">
                <div className="flex items-center gap-3"><div className="p-2 bg-slate-50 rounded-xl text-slate-600 group-hover:text-rose-500"><Navigation size={18}/></div><span className="font-bold text-slate-900 text-sm">Riwayat Perjalanan</span></div>
                <ChevronRight size={16} className="text-slate-300 group-hover:text-rose-500" />
              </button>
              <button onClick={() => navigate('/loker')} className="flex items-center justify-between p-4 bg-white hover:bg-slate-50 rounded-2xl transition-colors group">
                <div className="flex items-center gap-3"><div className="p-2 bg-slate-50 rounded-xl text-slate-600 group-hover:text-rose-500"><MapPin size={18}/></div><span className="font-bold text-slate-900 text-sm">Sewa Smart Loker</span></div>
                <ChevronRight size={16} className="text-slate-300 group-hover:text-rose-500" />
              </button>
            </div>

            {/* Kotak Bantuan Darurat */}
            <div className="bg-slate-900 rounded-[2.5rem] p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
              <h3 className="text-sm font-black mb-4 uppercase tracking-widest flex items-center gap-2"><Headset size={18} className="text-rose-400"/> Pusat Bantuan</h3>
              <p className="text-[11px] sm:text-xs text-slate-400 mb-6 leading-relaxed font-medium">Butuh bantuan darurat saat menyewa atau komplain?</p>
              <div className="space-y-3">
                <a href="https://wa.me/6281234567890" target="_blank" rel="noreferrer" className="w-full py-3.5 bg-[#25D366] hover:bg-[#20bd5a] text-white font-black rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-all"><MessageCircle size={18}/> Chat Admin (WA)</a>
                <button onClick={() => navigate('/support')} className="w-full py-3.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors backdrop-blur-sm"><LifeBuoy size={18}/> Buat Tiket Komplain</button>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* 6. Modal Edit Profil */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setIsEditModalOpen(false)}></div>
          <div className="relative bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden animate-fade-in-up">
            <div className="bg-slate-50 border-b border-slate-100 px-6 py-5 flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2"><Edit3 size={18} className="text-rose-500" /> Edit Profil</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6">
              
              <div className="mb-4">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Email Akun</label>
                <div className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-sm font-medium text-slate-500 flex items-center gap-2 cursor-not-allowed"><User size={16}/> {user?.email}</div>
              </div>
              
              <div className="mb-4">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Nama Lengkap</label>
                <input type="text" required value={editForm.name} onChange={(e) => setEditForm({...editForm, name: e.target.value})} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-slate-900 outline-none" />
              </div>
              
              <div className="mb-4">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Nomor WhatsApp</label>
                <input type="text" required value={editForm.phone} onChange={(e) => setEditForm({...editForm, phone: e.target.value})} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-slate-900 outline-none" />
              </div>

              <div className="mb-4">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Domisili / Lokasi</label>
                <div className="relative">
                  <select 
                    value={editForm.location} 
                    onChange={(e) => setEditForm({...editForm, location: e.target.value})}
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
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Password Baru</label>
                <input type="password" placeholder="Kosongkan jika tak ingin diubah" value={editForm.password} onChange={(e) => setEditForm({...editForm, password: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none" />
              </div>
              
              <button type="submit" disabled={isSavingProfile} className="w-full bg-slate-900 hover:bg-rose-500 text-white font-black py-4 rounded-xl text-sm transition-all shadow-lg active:scale-95 flex justify-center items-center gap-2">
                {isSavingProfile ? <Loader2 className="animate-spin" size={18} /> : 'Simpan Perubahan'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL GAMIFIKASI */}
      {showTCOnboarding && (
        <TCOnboardingModal 
          onClose={() => setShowTCOnboarding(false)}
          onClaimSuccess={handleClaimSuccess}
        />
      )}
      
    </div>
  );
}