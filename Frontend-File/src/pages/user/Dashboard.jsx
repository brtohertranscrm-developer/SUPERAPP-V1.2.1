import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useUserDashboard } from '../../hooks/useUserDashboard';
import { useGmapsReviewStatus } from '../../hooks/dashboard/useGmapsReviewStatus';
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
import PartnerVouchersSection from '../../components/user/dashboard/PartnerVouchersSection';
import InterCityOrderBanner from '../../components/user/dashboard/InterCityOrderBanner';
import ReferralInviteCard from '../../components/user/dashboard/ReferralInviteCard';
import TopTravellersCard from '../../components/user/dashboard/TopTravellersCard';
import QuickMenuCard from '../../components/user/dashboard/QuickMenuCard';
import HelpCenterCard from '../../components/user/dashboard/HelpCenterCard';
import EditProfileModal from '../../components/user/dashboard/EditProfileModal';
import PlacesSection from '../../components/user/dashboard/PlacesSection';
import { WA_CONTACTS, buildWaLink } from '../../config/contacts';

export default function Dashboard() {
  const {
    isLoading,
    kycStatus,
    bannerUrl,
    setBannerUrl,
    topTravellers,
    partnerVouchers,
    claimedPromos,
    user,
    activeOrder,
    currentOrderIndex,
    totalOrders,
    goToPrevOrder,
    goToNextOrder,
    saveProfile,
    updateBanner,
    updateProfilePicture,
    navigate,
    verifyKycCode,
    handleExtend,
  } = useUserDashboard();

  const {
    showReviewPopup,
    setShowReviewPopup,
    reviewStatus,
    rejectReason,
    fetchStatus,
    maybeAutoShowPopup,
    onSubmitSuccess,
  } = useGmapsReviewStatus({ user });

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [showTCOnboarding, setShowTCOnboarding] = useState(false);
  const [showCustomOrder, setShowCustomOrder] = useState(false);
  const [missionDoneOverride, setMissionDoneOverride] = useState(false);

  const hasCompletedMission =
    missionDoneOverride ||
    user?.has_completed_tc_gamification === 1 ||
    user?.has_completed_tc_gamification === true;

  React.useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  React.useEffect(() => maybeAutoShowPopup(), [maybeAutoShowPopup]);

  const [editForm, setEditForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
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
    setMissionDoneOverride(true);
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans text-slate-900 relative">
      <UserProfileHeader
        user={user}
        bannerUrl={bannerUrl}
        setBannerUrl={setBannerUrl}
        kycStatus={kycStatus}
        updateBanner={updateBanner}
        updateProfilePicture={updateProfilePicture}
        onEditClick={() => setIsEditModalOpen(true)}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20 -mt-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-8">
            {!hasCompletedMission && <MissionBanner onClick={() => setShowTCOnboarding(true)} />}

            {reviewStatus !== 'approved' && (
              <ReviewMissionBanner
                status={reviewStatus}
                rejectReason={rejectReason}
                onClick={() => setShowReviewPopup(true)}
              />
            )}

            {kycStatus !== 'verified' && <KycStatus status={kycStatus} verifyKycCode={verifyKycCode} />}

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

            <UserStats currentMiles={currentMiles} navigate={navigate} user={user} />

            <InterCityOrderBanner onClick={() => setShowCustomOrder(true)} />

            <PartnerVouchersSection vouchers={partnerVouchers} claimedPromos={claimedPromos} />

            <PlacesSection user={user} />

            <ReferralInviteCard referralCode={user?.referral_code} />
          </div>

          <div className="lg:col-span-4 space-y-6">
            <TopTravellersCard topTravellers={topTravellers} onStartAdventure={() => navigate('/motor')} />

            <ArticleSidebar navigate={navigate} />

            <QuickMenuCard onTripHistory={() => navigate('/trip-history')} onLocker={() => navigate('/loker')} />

            <HelpCenterCard
              supportWaHref={buildWaLink(
                WA_CONTACTS.SUPPORT_ADMIN.phone_wa,
                'Halo Admin Brother Trans, saya butuh bantuan.'
              )}
              onCreateTicket={() => navigate('/support')}
            />
          </div>
        </div>
      </div>

      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        userEmail={user?.email}
        editForm={editForm}
        setEditForm={setEditForm}
        isSavingProfile={isSavingProfile}
        onSubmit={handleSave}
      />

      {showTCOnboarding && <TCOnboardingModal onClose={() => setShowTCOnboarding(false)} onClaimSuccess={handleClaimSuccess} />}

      {showReviewPopup && reviewStatus !== 'approved' && (
        <ReviewPopup onClose={() => setShowReviewPopup(false)} onSubmitSuccess={onSubmitSuccess} completedOrder={activeOrder} />
      )}

      {showCustomOrder && <CustomOrderModal user={user} onClose={() => setShowCustomOrder(false)} />}
    </div>
  );
}
