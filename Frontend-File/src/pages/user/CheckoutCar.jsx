import React from 'react';
import { ChevronLeft } from 'lucide-react';
import CheckoutStepIndicator from '../../components/user/checkout/motor/CheckoutStepIndicator';
import KycBanner from '../../components/user/checkout/motor/KycBanner';
import ProcessingOverlay from '../../components/user/checkout/motor/ProcessingOverlay';
import CheckoutAsideCar from '../../components/user/checkout/car/CheckoutAsideCar';
import { CHECKOUT_CAR_STEPS } from '../../components/user/checkout/car/checkoutCarConstants';
import DetailStep from '../../components/user/checkout/car/steps/DetailStep';
import PaymentStep from '../../components/user/checkout/car/steps/PaymentStep';
import { useCheckoutCarFlow } from '../../hooks/useCheckoutCarFlow';

export default function CheckoutCar() {
  const flow = useCheckoutCarFlow();
  if (!flow.isReady) return null;

  const {
    bookingData,
    user,
    navigate,
    checkoutStep,
    setCheckoutStep,
    paymentMethod,
    setPaymentMethod,
    paymentInfo,
    computed,
    safeDiscount,
    grandTotal,
    appliedPromo,
    isCheckingPromo,
    handleApplyPromo,
    handleRemovePromo,
    isSubmitting,
    submitError,
    isKycVerified,
    handleCheckout,
  } = flow;

  const stepKeys = CHECKOUT_CAR_STEPS.map((s) => s.key);
  const currentStepIdx = Math.max(0, stepKeys.indexOf(checkoutStep));
  const isFirstStep = currentStepIdx === 0;
  const isLastStep = currentStepIdx === stepKeys.length - 1;

  const goPrevStep = () => setCheckoutStep(stepKeys[Math.max(0, currentStepIdx - 1)]);
  const goNextStep = () => setCheckoutStep(stepKeys[Math.min(stepKeys.length - 1, currentStepIdx + 1)]);

  return (
    <div className="bg-slate-50 min-h-screen pt-20 pb-24 font-sans text-slate-900 animate-fade-in-up">
      {isSubmitting && <ProcessingOverlay />}

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold mb-6 transition-colors text-sm"
        >
          <ChevronLeft size={18} /> Kembali
        </button>

        <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-6">Selesaikan Pesanan Mobil</h1>

        {!isKycVerified && <KycBanner status={user?.kyc_status} onNavigate={() => navigate('/dashboard')} />}

        <CheckoutStepIndicator steps={CHECKOUT_CAR_STEPS} activeKey={checkoutStep} />

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <div className={`flex-1 space-y-5 min-w-0 ${!isKycVerified ? 'opacity-40 pointer-events-none select-none' : ''}`}>
            {checkoutStep === 'detail' && <DetailStep bookingData={bookingData} computed={computed} />}

            {checkoutStep === 'payment' && (
              <PaymentStep
                paymentMethod={paymentMethod}
                setPaymentMethod={setPaymentMethod}
                paymentInfo={paymentInfo}
                handleApplyPromo={handleApplyPromo}
                appliedPromo={appliedPromo}
                handleRemovePromo={handleRemovePromo}
                safeDiscount={safeDiscount}
                isCheckingPromo={isCheckingPromo}
                grandTotal={grandTotal}
                submitError={submitError}
                isKycVerified={isKycVerified}
                handleCheckout={handleCheckout}
                isSubmitting={isSubmitting}
                goPrevStep={goPrevStep}
              />
            )}

            {checkoutStep !== 'payment' ? (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={goPrevStep}
                  disabled={isFirstStep}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-black text-sm hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Kembali
                </button>
                <div className="text-[11px] text-slate-500 font-bold">
                  Langkah {currentStepIdx + 1} dari {CHECKOUT_CAR_STEPS.length}
                </div>
                <button
                  type="button"
                  onClick={goNextStep}
                  disabled={isLastStep}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 text-white font-black text-sm hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Lanjut
                </button>
              </div>
            ) : (
              <div className="hidden lg:flex bg-white rounded-2xl border border-slate-200 shadow-sm p-4 items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={goPrevStep}
                  disabled={isFirstStep}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-black text-sm hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Kembali
                </button>
                <div className="text-[11px] text-slate-500 font-bold">
                  Langkah {currentStepIdx + 1} dari {CHECKOUT_CAR_STEPS.length}
                </div>
              </div>
            )}
          </div>

          <CheckoutAsideCar
            checkoutStep={checkoutStep}
            carName={bookingData?.carName || 'Mobil'}
            computed={computed}
            safeDiscount={safeDiscount}
            appliedPromo={appliedPromo}
            grandTotal={grandTotal}
            submitError={submitError}
            isKycVerified={isKycVerified}
            handleCheckout={handleCheckout}
            isSubmitting={isSubmitting}
          />
        </div>
      </div>
    </div>
  );
}

