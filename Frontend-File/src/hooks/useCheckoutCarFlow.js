import { useContext, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { apiFetch } from '../utils/api';
import { SERVICE_FEE } from '../components/user/checkout/car/checkoutCarConstants';
import { calcDays } from '../components/user/checkout/car/checkoutCarUtils';
import { usePaymentInfo } from './checkoutMotor/usePaymentInfo';
import { usePromoDiscount } from './checkoutMotor/usePromoDiscount';
import { useDeliveryQuote } from './checkoutMotor/useDeliveryQuote';
import { useSubmitCarBooking } from './checkoutCar/useSubmitCarBooking';

export const useCheckoutCarFlow = () => {
  const { user, updateKycStatus } = useContext(AuthContext) || {};
  const location = useLocation();
  const navigate = useNavigate();

  const bookingData = location.state;

  const [checkoutStep, setCheckoutStep] = useState('detail');
  const [paymentMethod, setPaymentMethod] = useState('bca');
  const { paymentInfo } = usePaymentInfo();

  const [tripScope, setTripScope] = useState('local'); // local | out_of_town
  const [tripDestination, setTripDestination] = useState('');
  const [tripDestinationError, setTripDestinationError] = useState('');

  useEffect(() => {
    if (!bookingData) {
      navigate('/mobil', { replace: true });
      return;
    }
    if (!user) {
      sessionStorage.setItem(
        'pending_checkout',
        JSON.stringify({ ...bookingData, checkout_path: '/checkout-mobil', item_type: 'car' })
      );
      navigate('/login', { replace: true });
    }
  }, [bookingData, user, navigate]);

  // Refresh ringan agar status KYC tidak stale setelah admin verifikasi
  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        const resultMe = await apiFetch('/api/dashboard/me');
        const fresh = String(resultMe?.data?.user?.kyc_status || '').toLowerCase();
        const current = String(user?.kyc_status || '').toLowerCase();
        if (!mounted) return;
        if (fresh && updateKycStatus && fresh !== current) updateKycStatus(fresh);
      } catch {
        // best-effort refresh; ignore network errors
      }
    };
    if (user) void run();
    return () => { mounted = false; };
  }, [user, updateKycStatus]);

  const computed = useMemo(() => {
    const days = calcDays(bookingData?.startDate, bookingData?.endDate);
    const basePricePerDay = Number(bookingData?.basePrice) || 0;
    const subTotal = basePricePerDay * days;
    const serviceFee = SERVICE_FEE;
    const beforeDiscount = subTotal + serviceFee;
    return { days, basePricePerDay, subTotal, serviceFee, beforeDiscount };
  }, [bookingData]);

  const pickupLocation = bookingData?.pickupCity || bookingData?.pickupLocation || '';

  const delivery = useDeliveryQuote({ pickupLocation, bookingData });
  const {
    handoverMethod,
    setHandoverMethod,
    deliveryTarget,
    setDeliveryTarget,
    stations,
    stationId,
    setStationId,
    selectedStation,
    deliveryAddress,
    setDeliveryAddress,
    mapsInput,
    setMapsInput,
    parsedLatLng,
    deliveryQuote,
    deliveryError,
    setDeliveryError,
    isDeliveryLoading,
    requestDeliveryQuote,
    deliveryFee,
  } = delivery;

  const isKycVerified = String(user?.kyc_status || '').trim().toLowerCase() === 'verified';

  const subTotal = Number(computed?.subTotal) || 0;
  const beforeDiscount = Number(computed?.beforeDiscount) || 0;

  const promo = usePromoDiscount({ subTotal, beforeDiscount });
  const {
    appliedPromo,
    safeDiscount,
    isCheckingPromo,
    handleApplyPromo,
    handleRemovePromo,
  } = promo;

  const grandTotal = useMemo(
    () => Math.max(0, beforeDiscount - safeDiscount + (Number(deliveryFee) || 0)),
    [beforeDiscount, safeDiscount, deliveryFee]
  );

  const submit = useSubmitCarBooking({
    isKycVerified,
    bookingData,
    computed,
    handoverMethod,
    deliveryTarget,
    mapsInput,
    deliveryQuote,
    requestDeliveryQuote,
    deliveryAddress,
    stationId,
    deliveryFee,
    safeDiscount,
    appliedPromoCode: appliedPromo?.code || null,
    grandTotal,
    paymentMethod,
    tripScope,
    tripDestination,
    navigate,
  });

  return {
    isReady: Boolean(bookingData && user),
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

    pickupLocation,
    handoverMethod,
    setHandoverMethod,
    deliveryTarget,
    setDeliveryTarget,
    stations,
    stationId,
    setStationId,
    selectedStation,
    deliveryAddress,
    setDeliveryAddress,
    mapsInput,
    setMapsInput,
    parsedLatLng,
    deliveryQuote,
    deliveryError,
    setDeliveryError,
    isDeliveryLoading,
    requestDeliveryQuote,
    deliveryFee,

    tripScope,
    setTripScope,
    tripDestination,
    setTripDestination,
    tripDestinationError,
    setTripDestinationError,

    isSubmitting: submit.isSubmitting,
    submitError: submit.submitError,
    isKycVerified,
    handleCheckout: submit.handleCheckout,
  };
};
