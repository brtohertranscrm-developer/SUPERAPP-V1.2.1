import { useCallback, useState } from 'react';
import { parseLatLngFromText } from '../../utils/geo';
import { API_BASE_URL } from '../../utils/api';
import { generateCarOrderId } from '../../components/user/checkout/car/checkoutCarUtils';

export const useSubmitCarBooking = ({
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
  appliedPromoCode,
  grandTotal,
  paymentMethod,
  tripScope,
  tripDestination,
  navigate,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleCheckout = useCallback(async () => {
    if (!isKycVerified) return;

    const dest = String(tripDestination || '').trim();
    if (!dest) {
      setSubmitError('Tujuan pemakaian wajib diisi.');
      return;
    }

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
        setSubmitError('Tempel link Google Maps atau koordinat (lat,lng) untuk alamat pengantaran.');
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
    if (!token) {
      sessionStorage.setItem(
        'pending_checkout',
        JSON.stringify({ ...bookingData, checkout_path: '/checkout-mobil', item_type: 'car' })
      );
      navigate('/login', { replace: true });
      setIsSubmitting(false);
      return;
    }

    const orderId = generateCarOrderId();

    const payload = {
      order_id: orderId,
      item_type: 'car',
      item_name: bookingData?.carName || 'Mobil',
      car_id: bookingData?.carId,
      location: bookingData?.pickupCity,
      start_date: bookingData?.startDate,
      end_date: bookingData?.endDate,
      base_price: Number(computed?.subTotal) || 0,
      service_fee: Number(computed?.serviceFee) || 0,
      discount_amount: Number(safeDiscount) || 0,
      promo_code: appliedPromoCode || null,
      total_price: Number(grandTotal) || 0,
      payment_method: paymentMethod,
      delivery_type: deliveryType,
      delivery_station_id: deliveryType === 'station' ? stationId : null,
      delivery_address: deliveryType === 'address' ? deliveryAddress || null : null,
      delivery_lat: deliveryType === 'address' ? destLat : null,
      delivery_lng: deliveryType === 'address' ? destLng : null,
      delivery_distance_km: deliveryType !== 'self' ? deliveryQuote?.distance_km ?? null : null,
      delivery_method: deliveryType !== 'self' ? deliveryQuote?.method ?? null : null,
      delivery_fee: Number(deliveryFee) || 0,
      trip_scope: tripScope,
      trip_destination: dest,
    };

    try {
      const res = await fetch(`${API_BASE_URL}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || `Gagal membuat booking (HTTP ${res.status}).`);
      }

      if (appliedPromoCode) {
        fetch(`${API_BASE_URL}/api/promotions/increment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ code: appliedPromoCode }),
        }).catch(() => {});
      }

      navigate(`/payment/${orderId}`, {
        state: {
          orderData: {
            ...(data?.data || {}),
            order_id: orderId,
            item_type: 'car',
            item_name: bookingData?.carName || 'Mobil',
            total_price: Number(grandTotal) || 0,
            payment_method: paymentMethod,
          },
        },
        replace: true,
      });
    } catch (err) {
      setSubmitError(err?.message || 'Koneksi ke server gagal.');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    isKycVerified,
    tripDestination,
    handoverMethod,
    deliveryTarget,
    mapsInput,
    deliveryQuote,
    requestDeliveryQuote,
    deliveryAddress,
    bookingData,
    computed?.subTotal,
    computed?.serviceFee,
    safeDiscount,
    appliedPromoCode,
    grandTotal,
    paymentMethod,
    stationId,
    deliveryFee,
    tripScope,
    navigate,
  ]);

  return { isSubmitting, submitError, setSubmitError, handleCheckout };
};
