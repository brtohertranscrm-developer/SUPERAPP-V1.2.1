import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { CHECKOUT_STEPS } from '../../components/user/checkout/motor/checkoutMotorConstants';
import CheckoutStepIndicator from '../../components/user/checkout/motor/CheckoutStepIndicator';
import KycBanner from '../../components/user/checkout/motor/KycBanner';
import ProcessingOverlay from '../../components/user/checkout/motor/ProcessingOverlay';
import CheckoutAside from '../../components/user/checkout/motor/CheckoutAside';
import DetailStep from '../../components/user/checkout/motor/steps/DetailStep';
import HandoverStep from '../../components/user/checkout/motor/steps/HandoverStep';
import PaymentStep from '../../components/user/checkout/motor/steps/PaymentStep';
import { useCheckoutMotorFlow } from '../../hooks/useCheckoutMotorFlow';

export default function CheckoutMotor() {
  const flow = useCheckoutMotorFlow();
  if (!flow.isReady) return null;
  const {
    user,
    navigate,
    motorName,
    pickupLocation,
    startDate,
    startTime,
    endDate,
    endTime,
    rentalBreakdown,
    checkoutStep,
    setCheckoutStep,
    paymentMethod,
    setPaymentMethod,
    paymentInfo,
    handleApplyPromo,
    appliedPromo,
    handleRemovePromo,
    safeDiscount,
    isCheckingPromo,
    grandTotal,
    submitError,
    isKycVerified,
    kycStatus,
    handleCheckout,
    isSubmitting,
    handoverMethod,
    setHandoverMethod,
    deliveryTarget,
    setDeliveryTarget,
    stationId,
    setStationId,
    stations,
    selectedStation,
    isDeliveryLoading,
    deliveryFee,
    deliveryAddress,
    setDeliveryAddress,
    mapsInput,
    setMapsInput,
    parsedLatLng,
    deliveryQuote,
    deliveryError,
    setDeliveryError,
    requestDeliveryQuote,
    tripScope,
    setTripScope,
    tripDestination,
    setTripDestination,
    tripDestinationError,
    setTripDestinationError,
    isAddonsLoading,
    addonsError,
    motorAddons,
    gearAddons,
    selectedAddons,
    otherAddons,
    setAddonQtyById,
    setAddonQty,
    addonItems,
    addonTotal,
    serviceFee,
  } = flow;

  const stepKeys = CHECKOUT_STEPS.map((s) => s.key);
  const currentStepIdx = Math.max(0, stepKeys.indexOf(checkoutStep));
  const isFirstStep = currentStepIdx === 0;
  const isLastStep = currentStepIdx === stepKeys.length - 1;

  const goPrevStep = () => setCheckoutStep(stepKeys[Math.max(0, currentStepIdx - 1)]);
  const goNextStep = () => setCheckoutStep(stepKeys[Math.min(stepKeys.length - 1, currentStepIdx + 1)]);

  const handleNextStep = () => {
    if (checkoutStep === 'handover') {
      const dest = String(tripDestination || '').trim();
      if (!dest) {
        setTripDestinationError('Tujuan perjalanan wajib diisi.');
        return;
      }
    }
    goNextStep();
  };

  return (
    <div className="bg-slate-50 min-h-screen pt-20 pb-24 font-sans text-slate-900 animate-fade-in-up">
      {isSubmitting && <ProcessingOverlay />}

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold mb-6 transition-colors text-sm"
        >
          <ChevronLeft size={18} /> Kembali ke Pencarian
        </button>

        <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-6">Selesaikan Pesanan</h1>

        {!isKycVerified && (
          <KycBanner status={kycStatus} onNavigate={() => navigate('/dashboard')} />
        )}

        <CheckoutStepIndicator steps={CHECKOUT_STEPS} activeKey={checkoutStep} />

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <div className={`flex-1 space-y-5 min-w-0 ${!isKycVerified ? 'opacity-40 pointer-events-none select-none' : ''}`}>
            {checkoutStep === 'detail' && (
              <DetailStep
                motorName={motorName}
                pickupLocation={pickupLocation}
                startDate={startDate}
                startTime={startTime}
                endDate={endDate}
                endTime={endTime}
                rentalBreakdown={rentalBreakdown}
                tripScope={tripScope}
                tripDestination={tripDestination}
                gearAddons={gearAddons}
                selectedAddons={selectedAddons}
                addonItems={addonItems}
                motorAddons={motorAddons}
                user={user}
              />
            )}

            {checkoutStep === 'handover' && (
              <HandoverStep
                pickupLocation={pickupLocation}
                handoverMethod={handoverMethod}
                setHandoverMethod={setHandoverMethod}
                deliveryTarget={deliveryTarget}
                setDeliveryTarget={setDeliveryTarget}
                stationId={stationId}
                setStationId={setStationId}
                stations={stations}
                selectedStation={selectedStation}
                isDeliveryLoading={isDeliveryLoading}
                deliveryFee={deliveryFee}
                deliveryAddress={deliveryAddress}
                setDeliveryAddress={setDeliveryAddress}
                mapsInput={mapsInput}
                setMapsInput={setMapsInput}
                parsedLatLng={parsedLatLng}
                deliveryQuote={deliveryQuote}
                deliveryError={deliveryError}
                setDeliveryError={setDeliveryError}
                requestDeliveryQuote={requestDeliveryQuote}
                tripScope={tripScope}
                setTripScope={setTripScope}
                tripDestination={tripDestination}
                setTripDestination={setTripDestination}
                tripDestinationError={tripDestinationError}
                setTripDestinationError={setTripDestinationError}
                isAddonsLoading={isAddonsLoading}
                addonsError={addonsError}
                motorAddons={motorAddons}
                gearAddons={gearAddons}
                selectedAddons={selectedAddons}
                otherAddons={otherAddons}
                setAddonQtyById={setAddonQtyById}
                setAddonQty={setAddonQty}
                addonTotal={addonTotal}
              />
            )}

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
                rentalBreakdown={rentalBreakdown}
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
                  Langkah {currentStepIdx + 1} dari {CHECKOUT_STEPS.length}
                </div>
                <button
                  type="button"
                  onClick={handleNextStep}
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
                  Langkah {currentStepIdx + 1} dari {CHECKOUT_STEPS.length}
                </div>
              </div>
            )}

            {isLastStep && (
              <p className="hidden lg:block text-center text-[11px] text-slate-500 font-bold">
                Terakhir, cek ringkasan pembayaran lalu klik tombol untuk membuat pesanan dan lanjut transfer.
              </p>
            )}
          </div>

          <CheckoutAside
            checkoutStep={checkoutStep}
            motorName={motorName}
            rentalBreakdown={rentalBreakdown}
            serviceFee={serviceFee}
            handoverMethod={handoverMethod}
            deliveryTarget={deliveryTarget}
            deliveryFee={deliveryFee}
            addonItems={addonItems}
            motorAddons={motorAddons}
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
