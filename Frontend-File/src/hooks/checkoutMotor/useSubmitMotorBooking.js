import { useCallback, useState } from 'react';
import {
  formatBillableSummary,
  formatDateTimeForInput,
} from '../../utils/motorRentalPricing';
import { parseLatLngFromText } from '../../utils/geo';
import { generateOrderId } from '../../components/user/checkout/motor/checkoutMotorUtils';

const API_URL = import.meta.env.VITE_API_URL?.trim() || '';

export const useSubmitMotorBooking = ({
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
  appliedPromoCode,
  grandTotal,
  paymentMethod,
  tripScope,
  tripDestination,
  motorName,
  pickupLocation,
  navigate,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleCheckout = useCallback(async () => {
    if (!isKycVerified || !rentalBreakdown?.isValid) return;
    setSubmitError('');
    setIsSubmitting(true);

    const deliveryType =
      handoverMethod === 'delivery'
        ? deliveryTarget === 'station'
          ? 'station'
          : 'address'
        : 'self';

    let destLat = null;
    let destLng = null;

    if (handoverMethod === 'delivery' && deliveryTarget === 'address') {
      const parsed = parseLatLngFromText(mapsInput);
      if (!parsed) {
        setSubmitError(
          'Tempel link Google Maps atau koordinat (lat,lng) untuk menghitung ongkir.'
        );
        setIsSubmitting(false);
        return;
      }
      destLat = parsed.lat;
      destLng = parsed.lng;

      if (!deliveryQuote || Number(deliveryQuote?.fee) < 0) {
        const q = await requestDeliveryQuote({
          type: 'address',
          lat: destLat,
          lng: destLng,
          address: deliveryAddress || null,
        });
        if (!q) {
          setIsSubmitting(false);
          return;
        }
      }
    }

    const token = localStorage.getItem('token');
    const orderId = generateOrderId();

    const startIso =
      rentalBreakdown.startAtIso ||
      (rentalBreakdown.startAt ? new Date(rentalBreakdown.startAt).toISOString() : null);
    const endIso =
      rentalBreakdown.endAtIso ||
      (rentalBreakdown.endAt ? new Date(rentalBreakdown.endAt).toISOString() : null);

    const payload = {
      order_id: orderId,
      item_type: 'motor',
      item_name: motorName,
      location: pickupLocation,
      addon_items: addonItems,
      delivery_type: deliveryType,
      delivery_station_id: deliveryType === 'station' ? stationId : null,
      delivery_address: deliveryType === 'address' ? deliveryAddress || null : null,
      delivery_lat: deliveryType === 'address' ? destLat : null,
      delivery_lng: deliveryType === 'address' ? destLng : null,
      delivery_distance_km:
        deliveryType !== 'self' ? deliveryQuote?.distance_km ?? null : null,
      delivery_method: deliveryType !== 'self' ? deliveryQuote?.method ?? null : null,
      delivery_fee: deliveryFee,
      start_date: startIso ? startIso : formatDateTimeForInput(rentalBreakdown.startAt),
      end_date: endIso ? endIso : formatDateTimeForInput(rentalBreakdown.endAt),
      duration_hours: rentalBreakdown.billableHours,
      base_price: subTotal,
      service_fee: serviceFee,
      discount_amount: safeDiscount,
      promo_code: appliedPromoCode || null,
      total_price: grandTotal,
      payment_method: paymentMethod,
      trip_scope: tripScope,
      trip_destination: tripDestination ? String(tripDestination).trim() : null,
      price_notes: `Motor billing ${formatBillableSummary(
        rentalBreakdown.count24h,
        rentalBreakdown.count12h
      )}`,
    };

    try {
      const res = await fetch(`${API_URL}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || `Gagal membuat pesanan (${res.status})`);
      }

      if (appliedPromoCode) {
        fetch(`${API_URL}/api/promotions/increment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ code: appliedPromoCode }),
        }).catch(() => {});
      }

      navigate(`/payment/${orderId}`, {
        state: {
          orderData: {
            ...(data?.data || {}),
            order_id: orderId,
            item_type: 'motor',
            item_name: motorName,
            total_price: grandTotal,
            payment_method: paymentMethod,
          },
        },
        replace: true,
      });
    } catch (err) {
      setSubmitError(err.message || 'Gagal membuat pesanan. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  }, [
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
    appliedPromoCode,
    grandTotal,
    paymentMethod,
    tripScope,
    tripDestination,
    motorName,
    pickupLocation,
    navigate,
  ]);

  return { isSubmitting, submitError, setSubmitError, handleCheckout };
};
