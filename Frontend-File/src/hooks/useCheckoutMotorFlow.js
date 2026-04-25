import { useContext, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { SERVICE_FEE } from '../components/user/checkout/motor/checkoutMotorConstants';
import { usePaymentInfo } from './checkoutMotor/usePaymentInfo';
import { useMotorBreakdownPreview } from './checkoutMotor/useMotorBreakdownPreview';
import { usePromoDiscount } from './checkoutMotor/usePromoDiscount';
import { useMotorAddonsSelection } from './checkoutMotor/useMotorAddonsSelection';
import { useDeliveryQuote } from './checkoutMotor/useDeliveryQuote';
import { useSubmitMotorBooking } from './checkoutMotor/useSubmitMotorBooking';

export const useCheckoutMotorFlow = () => {
  const { user } = useContext(AuthContext) || {};
  const location = useLocation();
  const navigate = useNavigate();

  const bookingData = location.state;

  const [checkoutStep, setCheckoutStep] = useState('detail');
  const [paymentMethod, setPaymentMethod] = useState('bca');

  const [tripScope, setTripScope] = useState('local'); // local | out_of_town
  const [tripDestination, setTripDestination] = useState('');
  const [tripDestinationError, setTripDestinationError] = useState('');

  useEffect(() => {
    if (!bookingData) {
      navigate('/', { replace: true });
      return;
    }
    if (!user) {
      sessionStorage.setItem(
        'pending_checkout',
        JSON.stringify({ ...bookingData, checkout_path: '/checkout-motor' })
      );
      navigate('/login', { replace: true });
    }
  }, [bookingData, user, navigate]);

  const {
    motorName = 'Motor',
    pickupLocation = 'Lokasi tidak diketahui',
  } = bookingData || {};

  const { paymentInfo } = usePaymentInfo();
  const {
    rentalBreakdown,
    startDate,
    startTime,
    endDate,
    endTime,
  } = useMotorBreakdownPreview(bookingData);

  const {
    motorAddons,
    isAddonsLoading,
    addonsError,
    gearAddons,
    otherAddons,
    selectedAddons,
    addonItems,
    addonTotal,
    setAddonQty,
    setAddonQtyById,
  } = useMotorAddonsSelection();

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

  const subTotal = rentalBreakdown?.isValid ? rentalBreakdown.baseTotal : 0;
  const serviceFee = SERVICE_FEE;
  const beforeDiscount = subTotal + serviceFee;

  const promo = usePromoDiscount({ subTotal, beforeDiscount });
  const {
    appliedPromo,
    safeDiscount,
    isCheckingPromo,
    handleApplyPromo,
    handleRemovePromo,
  } = promo;

  const grandTotal = useMemo(
    () => Math.max(0, beforeDiscount - safeDiscount + deliveryFee + addonTotal),
    [beforeDiscount, safeDiscount, deliveryFee, addonTotal]
  );

  const isKycVerified = user?.kyc_status === 'verified';

  const submit = useSubmitMotorBooking({
    isKycVerified,
    rentalBreakdown,
    handoverMethod,
    deliveryTarget,
    mapsInput,
    deliveryQuote,
    requestDeliveryQuote,
    deliveryAddress,
    addonItems,
    stationId,
    deliveryFee,
    subTotal,
    serviceFee,
    safeDiscount,
    appliedPromoCode: appliedPromo?.code || null,
    grandTotal,
    paymentMethod,
    tripScope,
    tripDestination,
    motorName,
    pickupLocation,
    navigate,
  });

  return {
    isReady: Boolean(bookingData && user),
    bookingData,
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

    appliedPromo,
    safeDiscount,
    isCheckingPromo,
    handleApplyPromo,
    handleRemovePromo,

    isSubmitting: submit.isSubmitting,
    submitError: submit.submitError,
    setSubmitError: submit.setSubmitError,

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

    isAddonsLoading,
    addonsError,
    motorAddons,
    gearAddons,
    otherAddons,
    selectedAddons,
    setAddonQty,
    setAddonQtyById,
    addonItems,
    addonTotal,

    subTotal,
    serviceFee,
    grandTotal,
    handleCheckout: submit.handleCheckout,
  };
};
