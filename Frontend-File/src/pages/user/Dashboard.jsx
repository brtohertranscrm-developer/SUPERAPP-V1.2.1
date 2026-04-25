import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useUserDashboard } from '../../hooks/useUserDashboard';
import UserProfileHeader from '../../components/user/dashboard/UserProfileHeader';
import ActiveBookingCard from '../../components/user/dashboard/ActiveBookingCard';
import UserStats from '../../components/user/dashboard/UserStats';
import KycStatus from '../../components/user/kyc/KycStatus';
import ArticleSidebar from '../../components/user/dashboard/ArticleSidebar';
import ReviewPopup from '../../components/user/dashboard/ReviewPopup';
import ReviewMissionBanner from '../../components/user/dashboard/ReviewMissionBanner';
import MissionBanner from '../../components/user/dashboard/MissionBanner';
import TCOnboardingModal from '../../components/user/dashboard/TCOnboardingModal';
import CustomOrderModal from '../../components/user/dashboard/CustomOrderModal';
import { WA_CONTACTS, buildWaLink } from '../../config/contacts';

import {
  Trophy, Gift, Navigation, MapPin, ChevronRight,
  Headset, MessageCircle, LifeBuoy, X, User, Edit3, Copy, Ticket, CheckCircle2, Clock3, Phone, Truck
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL?.trim() || '';

export default function Dashboard() {
  const {
    isLoading, kycStatus, bannerUrl, setBannerUrl, topTravellers,
    partnerVouchers, claimedPromos,
    user, activeOrder, activeOrders, currentOrderIndex, totalOrders,
    goToPrevOrder, goToNextOrder,
    saveProfile, updateBanner, navigate, verifyKycCode, handleExtend,
  } = useUserDashboard();

  const [isEditModalOpen, setIsEditModalOpen]   = useState(false);
  const [isSavingProfile, setIsSavingProfile]   = useState(false);
  const [showTCOnboarding, setShowTCOnboarding] = useState(false);
  const [showCustomOrder, setShowCustomOrder]   = useState(false);

  // ── Gamifikasi TC ────────────────────────────────────────────────────────────
  const [hasCompletedMission, setHasCompletedMission] = useState(
    user?.has_completed_tc_gamification === 1 || user?.has_completed_tc_gamification === true
  );

  React.useEffect(() => {
    if (user?.has_completed_tc_gamification === 1 || user?.has_completed_tc_gamification === true) {
      setHasCompletedMission(true);
    }
  }, [user]);

  // ── Gamifikasi Review GMaps ───────────────────────────────────────────────────
  const [showReviewPopup, setShowReviewPopup] = useState(false);
  const [reviewStatus, setReviewStatus]       = useState(null); // null | 'pending' | 'rejected' | 'approved'
  const [rejectReason, setRejectReason]       = useState('');

  // Fetch status review user saat pertama kali user tersedia
  React.useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    fetch(`${API_URL}/api/reviews/gmaps/status`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        if (!data.success) return;
        const lr = data.data.latest_review;
        if (data.data.has_reviewed) {
          setReviewStatus('approved');
        } else if (lr) {
          setReviewStatus(lr.status);
          if (lr.status === 'rejected') setRejectReason(lr.reject_reason || '');
        }
      })
      .catch(() => {});
  }, [user]);

  // Popup muncul otomatis 2 detik setelah load — hanya 1x per sesi, hanya jika belum review
  React.useEffect(() => {
    if (!user) return;
    if (reviewStatus === 'approved' || reviewStatus === 'pending') return;
    if (sessionStorage.getItem('review_popup_shown')) return;
    // Tampilkan hanya jika user sudah pernah booking (miles > 0 sebagai indikator)
    if ((user?.miles || 0) <= 0) return;

    const timer = setTimeout(() => {
      setShowReviewPopup(true);
      sessionStorage.setItem('review_popup_shown', '1');
    }, 2000);
    return () => clearTimeout(timer);
  }, [user, reviewStatus]);

  // ── Edit form ────────────────────────────────────────────────────────────────
  const [editForm, setEditForm] = useState({
    name:     user?.name     || '',
    phone:    user?.phone    || '',
    location: user?.location || 'Lainnya',
    password: '',
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-rose-500" size={40} />
      </div>
    );
  }

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

  const handleClaimSuccess = () => {
    setShowTCOnboarding(false);
    setHasCompletedMission(true);
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans text-slate-900 relative">

      {/* Header Profil */}
      <UserProfileHeader
        user={user} bannerUrl={bannerUrl} setBannerUrl={setBannerUrl}
        kycStatus={kycStatus} updateBanner={updateBanner}
        onEditClick={() => setIsEditModalOpen(true)}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20 -mt-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* ── KIRI / UTAMA ── */}
          <div className="lg:col-span-8 space-y-8">

            {/* Banner misi TC */}
            {!hasCompletedMission && (
              <MissionBanner onClick={() => setShowTCOnboarding(true)} />
            )}

            {/* Banner review GMaps — tampil selama belum approved */}
            {reviewStatus !== 'approved' && (
              <ReviewMissionBanner
                status={reviewStatus}
                rejectReason={rejectReason}
                onClick={() => setShowReviewPopup(true)}
              />
            )}

            {/* Status KYC */}
            {kycStatus !== 'verified' && (
              <KycStatus status={kycStatus} verifyKycCode={verifyKycCode} />
            )}

            {/* Pesanan Aktif */}
            <ActiveBookingCard
              order={activeOrder}
              activeOrder={activeOrder}
              user={user}
              navigate={navigate}
              handleExtend={handleExtend}
              currentOrderIndex={currentOrderIndex}
              totalOrders={totalOrders}
              goToPrevOrder={goToPrevOrder}
              goToNextOrder={goToNextOrder}
            />

            {/* Miles */}
            <UserStats currentMiles={currentMiles} navigate={navigate} user={user} />

            {/* Custom Order — Inter-City Banner */}
            <div
              onClick={() => setShowCustomOrder(true)}
              className="cursor-pointer group relative overflow-hidden rounded-[2rem] bg-slate-900 p-6 sm:p-8 text-white shadow-xl"
            >
              {/* Decorative blobs */}
              <div className="pointer-events-none absolute -top-10 -right-10 w-48 h-48 rounded-full bg-rose-500/20 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-12 left-10 w-40 h-40 rounded-full bg-amber-400/10 blur-3xl" />

              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                <div className="flex-1">
                  {/* Label */}
                  <div className="inline-flex items-center gap-1.5 bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full mb-4">
                    <Truck size={11} /> Layanan Baru
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-black leading-tight mb-2">
                    Motor di Kota Lain?<br />
                    <span className="text-rose-400">Kita Kirimin!</span>
                  </h3>
                  <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-xs">
                    Nggak nemu unit yang kamu mau di kotamu? Kami bisa kirim dari kota lain — Jogja atau Solo.
                  </p>

                  {/* Syarat pills */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {['Min. 3 Hari', 'Booking H-1', 'Full Payment'].map((s) => (
                      <span key={s} className="px-3 py-1 rounded-full bg-white/10 text-white text-[10px] font-black tracking-wide">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="shrink-0">
                  <div className="inline-flex items-center gap-2 bg-rose-500 group-hover:bg-rose-400 transition-colors text-white font-black px-6 py-4 rounded-2xl text-sm shadow-lg">
                    <Truck size={18} /> Minta Unit Sekarang
                  </div>
                </div>
              </div>
            </div>

            <UserPartnerVouchers vouchers={partnerVouchers} claimedPromos={claimedPromos} />

            {/* Ajak Teman */}
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[2rem] p-6 sm:p-8 text-white relative overflow-hidden flex flex-col sm:flex-row justify-between items-center sm:items-end shadow-sm gap-6">
              <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10 w-full sm:w-auto text-center sm:text-left">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/20 mb-4 mx-auto sm:mx-0">
                  <Gift size={20} />
                </div>
                <h3 className="text-xl sm:text-2xl font-black mb-1 leading-tight drop-shadow-sm">
                  Ajak Teman,<br />Dapat Cuan!
                </h3>
                <p className="text-indigo-100 text-xs sm:text-sm font-medium leading-relaxed max-w-xs mx-auto sm:mx-0">
                  Dapatkan 50 Miles setiap teman mendaftar pakai kode Anda.
                </p>
              </div>
              <button
                onClick={() => { navigator.clipboard.writeText(user.referral_code || ''); alert('Kode tersalin!'); }}
                className="w-full sm:w-auto px-8 py-4 bg-white text-indigo-600 font-black rounded-xl text-sm flex items-center justify-center gap-2 hover:scale-105 transition-transform shadow-xl relative z-10 whitespace-nowrap"
              >
                <Copy size={18} /> Salin Kode
              </button>
            </div>

          </div>

          {/* ── KANAN / SIDEBAR ── */}
          <div className="lg:col-span-4 space-y-6">

            {/* Top Traveller */}
            <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-100">
              <h3 className="text-sm font-black text-slate-900 mb-4 uppercase tracking-widest flex items-center gap-2">
                <Trophy size={16} className="text-amber-500" /> Top Traveller
              </h3>
              <div className="space-y-4">
                {topTravellers.length > 0 ? (
                  topTravellers.map((member, i) => {
                    const colors = ['bg-amber-100 text-amber-700', 'bg-slate-100 text-slate-600', 'bg-orange-100 text-orange-700'];
                    return (
                      <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${colors[i] || colors[1]}`}>
                            #{i + 1}
                          </div>
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
                    <button
                      onClick={() => navigate('/motor')}
                      className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-rose-500 transition-colors"
                    >
                      Mulai Petualangan
                    </button>
                  </div>
                )}
              </div>
            </div>

            <ArticleSidebar navigate={navigate} />

            {/* Menu Cepat */}
            <div className="bg-white rounded-[2.5rem] p-4 shadow-sm border border-slate-100 flex flex-col gap-2">
              <button
                onClick={() => navigate('/trip-history')}
                className="flex items-center justify-between p-4 bg-white hover:bg-slate-50 rounded-2xl transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-50 rounded-xl text-slate-600 group-hover:text-rose-500"><Navigation size={18} /></div>
                  <span className="font-bold text-slate-900 text-sm">Riwayat Perjalanan</span>
                </div>
                <ChevronRight size={16} className="text-slate-300 group-hover:text-rose-500" />
              </button>
              <button
                onClick={() => navigate('/loker')}
                className="flex items-center justify-between p-4 bg-white hover:bg-slate-50 rounded-2xl transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-50 rounded-xl text-slate-600 group-hover:text-rose-500"><MapPin size={18} /></div>
                  <span className="font-bold text-slate-900 text-sm">Sewa Smart Loker</span>
                </div>
                <ChevronRight size={16} className="text-slate-300 group-hover:text-rose-500" />
              </button>
            </div>

            {/* Bantuan Darurat */}
            <div className="bg-slate-900 rounded-[2.5rem] p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
              <h3 className="text-sm font-black mb-4 uppercase tracking-widest flex items-center gap-2">
                <Headset size={18} className="text-rose-400" /> Pusat Bantuan
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-400 mb-6 leading-relaxed font-medium">
                Butuh bantuan darurat saat menyewa atau komplain?
              </p>
              <div className="space-y-3">
                <a
                  href={buildWaLink(WA_CONTACTS.SUPPORT_ADMIN.phone_wa, 'Halo Admin Brother Trans, saya butuh bantuan.')}
                  target="_blank" rel="noreferrer"
                  className="w-full py-3.5 bg-[#25D366] hover:bg-[#20bd5a] text-white font-black rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-all"
                >
                  <MessageCircle size={18} /> Chat Admin (WA)
                </a>
                <button
                  onClick={() => navigate('/support')}
                  className="w-full py-3.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors backdrop-blur-sm"
                >
                  <LifeBuoy size={18} /> Buat Tiket Komplain
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Modal Edit Profil */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsEditModalOpen(false)}
          />
          <div className="relative bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden animate-fade-in-up">
            <div className="bg-slate-50 border-b border-slate-100 px-6 py-5 flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Edit3 size={18} className="text-rose-500" /> Edit Profil
              </h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6">
              <div className="mb-4">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Email Akun</label>
                <div className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-sm font-medium text-slate-500 flex items-center gap-2 cursor-not-allowed">
                  <User size={16} /> {user?.email}
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Nama Lengkap</label>
                <input
                  type="text" required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-slate-900 outline-none"
                />
              </div>
              <div className="mb-4">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Nomor WhatsApp</label>
                <input
                  type="text" required
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-slate-900 outline-none"
                />
              </div>
              <div className="mb-4">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Domisili / Lokasi</label>
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
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 font-black">▼</div>
                </div>
              </div>
              <div className="mb-6">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Password Baru</label>
                <input
                  type="password"
                  placeholder="Kosongkan jika tak ingin diubah"
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none"
                />
              </div>
              <button
                type="submit" disabled={isSavingProfile}
                className="w-full bg-slate-900 hover:bg-rose-500 text-white font-black py-4 rounded-xl text-sm transition-all shadow-lg active:scale-95 flex justify-center items-center gap-2"
              >
                {isSavingProfile ? <Loader2 className="animate-spin" size={18} /> : 'Simpan Perubahan'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Gamifikasi TC */}
      {showTCOnboarding && (
        <TCOnboardingModal
          onClose={() => setShowTCOnboarding(false)}
          onClaimSuccess={handleClaimSuccess}
        />
      )}

      {/* Popup Review GMaps — muncul otomatis 1x & bisa dibuka manual dari banner */}
      {showReviewPopup && reviewStatus !== 'approved' && (
        <ReviewPopup
          onClose={() => setShowReviewPopup(false)}
          onSubmitSuccess={() => {
            setReviewStatus('pending');
            setShowReviewPopup(false);
          }}
          completedOrder={activeOrder}
        />
      )}

      {/* Modal Custom Order */}
      {showCustomOrder && (
        <CustomOrderModal
          user={user}
          onClose={() => setShowCustomOrder(false)}
        />
      )}

    </div>
  );
}

function UserPartnerVouchers({ vouchers = [], claimedPromos = [] }) {
  const activeVouchers = vouchers.filter((voucher) => voucher.status === 'claimed');
  const recentVouchers = vouchers.slice(0, 4);
  const hasAny = recentVouchers.length > 0 || claimedPromos.length > 0;

  return (
    <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-sm border border-slate-100">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
        <div>
          <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Ticket size={18} className="text-indigo-600" /> Promo Saya
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Voucher partner dan kode promo yang sudah kamu klaim.
          </p>
        </div>
        <div className="px-4 py-2 rounded-2xl bg-indigo-50 text-indigo-700 text-xs font-black">
          Aktif {activeVouchers.length + claimedPromos.length}
        </div>
      </div>

      {/* Claimed promo codes dari carousel */}
      {claimedPromos.length > 0 && (
        <div className="space-y-3 mb-4">
          {claimedPromos.map((p) => (
            <div key={p.id} className="rounded-[1.5rem] border border-rose-100 bg-rose-50 px-5 py-4 flex items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-rose-500 bg-rose-100 px-2 py-0.5 rounded-full">{p.tag || 'Promo'}</span>
                <p className="font-black text-slate-900 mt-1">{p.title}</p>
                {p.discount_percent > 0 && (
                  <p className="text-xs text-slate-500 font-medium mt-0.5">Diskon {p.discount_percent}%{p.max_discount > 0 ? ` maks Rp${p.max_discount.toLocaleString('id-ID')}` : ''}</p>
                )}
              </div>
              <div className="shrink-0 bg-white border border-rose-200 rounded-xl px-4 py-2 text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kode</p>
                <p className="font-mono font-black text-slate-900 text-sm">{p.code}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {!hasAny ? (
        <div className="rounded-[2rem] border border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center">
          <Ticket size={30} className="mx-auto text-slate-300 mb-3" />
          <p className="text-sm font-black text-slate-900">Belum ada promo yang diklaim</p>
          <p className="text-xs text-slate-500 font-medium mt-2">
            Buka homepage, pilih promo, lalu klik klaim agar promo masuk ke dashboard ini.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {recentVouchers.map((voucher) => {
            const isActive = voucher.status === 'claimed';
            const badgeClass = isActive
              ? 'bg-emerald-50 text-emerald-700'
              : voucher.status === 'used'
                ? 'bg-slate-100 text-slate-700'
                : 'bg-amber-50 text-amber-700';
            const badgeLabel = isActive ? 'Siap Dipakai' : voucher.status === 'used' ? 'Sudah Dipakai' : 'Expired';

            return (
              <div key={voucher.id} className="rounded-[2rem] border border-slate-100 bg-slate-50 px-5 py-5">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] ${badgeClass}`}>
                        {badgeLabel}
                      </span>
                      <span className="px-3 py-1 rounded-full bg-white border border-slate-200 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">
                        {voucher.category || 'Partner'}
                      </span>
                    </div>
                    <h4 className="text-lg font-black text-slate-900">{voucher.partner_name}</h4>
                    <p className="text-sm text-slate-600 font-medium mt-1 leading-relaxed">
                      {voucher.headline || voucher.promo_text || 'Promo partner tersedia.'}
                    </p>
                  </div>
                  <div className="shrink-0 rounded-[1.5rem] bg-white border border-slate-200 px-4 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Kode Voucher</p>
                    <p className="mt-1 text-sm font-black tracking-wide text-slate-900">{voucher.voucher_code}</p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3 mt-4">
                  <VoucherInfo
                    icon={<Clock3 size={14} />}
                    label="Status"
                    value={isActive ? 'Tunjukkan ke partner saat redeem.' : badgeLabel}
                  />
                  <VoucherInfo
                    icon={<MapPin size={14} />}
                    label="Lokasi"
                    value={[voucher.city, voucher.address].filter(Boolean).join(' - ') || 'Lihat lokasi partner'}
                  />
                  <VoucherInfo
                    icon={<CheckCircle2 size={14} />}
                    label="Berlaku"
                    value={voucher.valid_until ? new Date(voucher.valid_until).toLocaleDateString('id-ID') : 'Selama promo aktif'}
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(voucher.voucher_code || '');
                      alert('Kode voucher berhasil disalin.');
                    }}
                    className="flex-1 py-3 rounded-2xl bg-white border border-slate-200 text-slate-900 font-black text-sm inline-flex items-center justify-center gap-2"
                  >
                    <Copy size={16} /> Salin Kode Voucher
                  </button>
                  {voucher.maps_url ? (
                    <button
                      type="button"
                      onClick={() => window.open(voucher.maps_url, '_blank', 'noreferrer')}
                      className="flex-1 py-3 rounded-2xl bg-white border border-slate-200 text-slate-900 font-black text-sm inline-flex items-center justify-center gap-2"
                    >
                      <MapPin size={16} /> Buka Lokasi
                    </button>
                  ) : null}
                  {voucher.phone_wa ? (
                    <button
                      type="button"
                      onClick={() => window.open(`https://wa.me/${String(voucher.phone_wa).replace(/\D/g, '')}`, '_blank', 'noreferrer')}
                      className="flex-1 py-3 rounded-2xl bg-white border border-slate-200 text-slate-900 font-black text-sm inline-flex items-center justify-center gap-2"
                    >
                      <Phone size={16} /> Hubungi Partner
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function VoucherInfo({ icon, label, value }) {
  return (
    <div className="rounded-[1.5rem] bg-white border border-slate-100 px-4 py-3">
      <div className="flex items-center gap-2 text-slate-500 mb-1">
        {icon}
        <span className="text-[10px] font-black uppercase tracking-[0.2em]">{label}</span>
      </div>
      <p className="text-sm font-semibold text-slate-800 leading-relaxed">{value}</p>
    </div>
  );
}
