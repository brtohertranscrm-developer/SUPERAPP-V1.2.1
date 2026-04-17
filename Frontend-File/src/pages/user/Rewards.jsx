import React from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useRewards } from '../../hooks/useRewards';
import MilesCard from '../../components/user/rewards/MilesCard';
import RedeemCatalog from '../../components/user/rewards/RedeemCatalog';

export default function Rewards() {
  const {
    navigate,
    currentMiles,
    isLoading,
    isRedeeming,
    handleRedeem
  } = useRewards();

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

        {/* List Rewards */}
        <RedeemCatalog 
          currentMiles={currentMiles} 
          isRedeeming={isRedeeming} 
          onRedeem={handleRedeem} 
        />

      </div>
    </div>
  );
}