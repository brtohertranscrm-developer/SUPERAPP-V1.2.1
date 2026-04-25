import React, { useState, useMemo } from 'react';
import { ArrowLeft, Loader2, LayoutGrid, Ticket, AlertCircle, X } from 'lucide-react';
import { useRewards } from '../../hooks/useRewards';
import MilesCard from '../../components/user/rewards/MilesCard';
import RedeemCatalog from '../../components/user/rewards/RedeemCatalog';
import MyVouchers from '../../components/user/rewards/MyVouchers';
import VoucherSuccessModal from '../../components/user/rewards/VoucherSuccessModal';
import ConfirmRedeemModal from '../../components/user/rewards/ConfirmRedeemModal';

export default function Rewards() {
  const {
    navigate,
    currentMiles,
    isLoading,
    isRedeeming,
    rewards,
    vouchers,
    isLoadingVouchers,
    handleRedeem,
    handleConfirmRedeem,
    handleCancelVoucher,
    confirmReward,
    setConfirmReward,
    successVoucher,
    dismissSuccessVoucher,
    newVoucherCode,
    redeemError,
    dismissError,
  } = useRewards();

  const [activeTab, setActiveTab] = useState('catalog'); // 'catalog' | 'vouchers'

  const activeVoucherCount = useMemo(
    () => vouchers.filter((v) => v.status === 'active').length,
    [vouchers]
  );

  // Saat user klik "Lihat Semua Voucher" dari success modal
  const handleGoToVouchers = () => {
    dismissSuccessVoucher();
    setActiveTab('vouchers');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-rose-500" size={40} />
      </div>
    );
  }

  return (
    <div className="py-8 sm:py-12 bg-slate-50 min-h-screen animate-fade-in-up">
      <div className="max-w-5xl mx-auto px-4">

        {/* Tombol Kembali */}
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-gray-500 hover:text-slate-900 transition-colors font-bold mb-8 w-fit"
        >
          <ArrowLeft size={20} /> Kembali
        </button>

        {/* Header Hero (Kartu Saldo) */}
        <MilesCard currentMiles={currentMiles} />

        {/* Error toast */}
        {redeemError && (
          <div className="mt-4 flex items-center gap-3 bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3 text-rose-700 text-sm font-semibold">
            <AlertCircle size={16} className="shrink-0" />
            <span className="flex-1">{redeemError}</span>
            <button onClick={dismissError} className="text-rose-400 hover:text-rose-600">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="mt-8 mb-6 flex items-center gap-2 bg-white border border-slate-100 rounded-2xl p-1.5 w-fit shadow-sm">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all ${
              activeTab === 'catalog'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <LayoutGrid size={15} />
            Katalog Reward
          </button>
          <button
            onClick={() => setActiveTab('vouchers')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all relative ${
              activeTab === 'vouchers'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Ticket size={15} />
            Voucher Saya
            {activeVoucherCount > 0 && (
              <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-black ${
                activeTab === 'vouchers' ? 'bg-rose-500 text-white' : 'bg-rose-500 text-white'
              }`}>
                {activeVoucherCount}
              </span>
            )}
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'catalog' ? (
          <RedeemCatalog
            rewards={rewards}
            currentMiles={currentMiles}
            isRedeeming={isRedeeming}
            onRedeem={handleRedeem}
          />
        ) : (
          <MyVouchers
            vouchers={vouchers}
            isLoading={isLoadingVouchers}
            onCancel={handleCancelVoucher}
            highlightCode={newVoucherCode}
          />
        )}

      </div>

      {/* Modal: Konfirmasi Tukar */}
      <ConfirmRedeemModal
        reward={confirmReward}
        currentMiles={currentMiles}
        isRedeeming={isRedeeming}
        onConfirm={handleConfirmRedeem}
        onClose={() => setConfirmReward(null)}
      />

      {/* Modal: Sukses + Kode Voucher */}
      <VoucherSuccessModal
        voucher={successVoucher}
        onClose={dismissSuccessVoucher}
        onGoToVouchers={handleGoToVouchers}
      />
    </div>
  );
}
