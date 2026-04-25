import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { API_BASE_URL } from '../utils/api';
import { SERVICE_FEE } from '../components/user/checkout/car/checkoutCarConstants';
import { calcDays, generateCarOrderId } from '../components/user/checkout/car/checkoutCarUtils';

export const useCheckoutCarFlow = () => {
  const { user } = useContext(AuthContext) || {};
  const location = useLocation();
  const navigate = useNavigate();

  const bookingData = location.state;

  const [checkoutStep, setCheckoutStep] = useState('detail');
  const [paymentMethod, setPaymentMethod] = useState('bca');
  const [paymentInfo, setPaymentInfo] = useState(null);

  const [appliedPromo, setAppliedPromo] = useState(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [isCheckingPromo, setIsCheckingPromo] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

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

  useEffect(() => {
    let isMounted = true;
    fetch(`${API_BASE_URL}/api/payment-info`)
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        if (!isMounted) return;
        if (ok && j?.success && j?.data) setPaymentInfo(j.data);
        else setPaymentInfo(null);
      })
      .catch(() => {
        if (isMounted) setPaymentInfo(null);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const computed = useMemo(() => {
    const days = calcDays(bookingData?.startDate, bookingData?.endDate);
    const basePricePerDay = Number(bookingData?.basePrice) || 0;
    const subTotal = basePricePerDay * days;
    const serviceFee = SERVICE_FEE;
    const beforeDiscount = subTotal + serviceFee;
    return { days, basePricePerDay, subTotal, serviceFee, beforeDiscount };
  }, [bookingData]);

  const safeDiscount = useMemo(() => {
    return Math.min(
      Math.max(0, Number(discountAmount) || 0),
      Number(computed.beforeDiscount) || 0
    );
  }, [discountAmount, computed.beforeDiscount]);

  const grandTotal = useMemo(
    () => Math.max(0, computed.beforeDiscount - safeDiscount),
    [computed.beforeDiscount, safeDiscount]
  );

  const isKycVerified = user?.kyc_status === 'verified';

  const handleApplyPromo = useCallback(
    async (code) => {
      setIsCheckingPromo(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/promotions/validate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });
        const result = await res.json();

        if (result.success && result.data) {
          const promo = result.data;
          const rawDiscount = Math.floor(
            (Number(computed.subTotal) * (promo.discount_percent || 0)) / 100
          );
          const capped =
            promo.max_discount > 0
              ? Math.min(rawDiscount, promo.max_discount)
              : rawDiscount;
          setAppliedPromo(promo);
          setDiscountAmount(capped);
          return { success: true };
        }
        return { success: false, error: result.error || 'Kode promo tidak valid.' };
      } catch {
        return { success: false, error: 'Gagal terhubung ke server.' };
      } finally {
        setIsCheckingPromo(false);
      }
    },
    [computed.subTotal]
  );

  const handleRemovePromo = useCallback(() => {
    setAppliedPromo(null);
    setDiscountAmount(0);
  }, []);

  const handleCheckout = useCallback(async () => {
    setSubmitError('');
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        sessionStorage.setItem(
          'pending_checkout',
          JSON.stringify({ ...bookingData, checkout_path: '/checkout-mobil', item_type: 'car' })
        );
        navigate('/login', { replace: true });
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
        base_price: computed.subTotal,
        service_fee: computed.serviceFee,
        discount_amount: safeDiscount,
        promo_code: appliedPromo?.code || null,
        total_price: grandTotal,
        payment_method: paymentMethod,
      };

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
        setSubmitError(data?.error || `Gagal membuat booking (HTTP ${res.status}).`);
        return;
      }

      if (appliedPromo?.code) {
        fetch(`${API_BASE_URL}/api/promotions/increment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ code: appliedPromo.code }),
        }).catch(() => {});
      }

      navigate(`/payment/${orderId}`, {
        state: {
          orderData: {
            order_id: orderId,
            item_type: 'car',
            item_name: bookingData?.carName || 'Mobil',
            total_price: grandTotal,
            payment_method: paymentMethod,
          },
        },
        replace: true,
      });
    } catch (e) {
      setSubmitError(e?.message || 'Koneksi ke server gagal.');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    appliedPromo?.code,
    bookingData,
    computed.serviceFee,
    computed.subTotal,
    grandTotal,
    navigate,
    paymentMethod,
    safeDiscount,
  ]);

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

    isSubmitting,
    submitError,
    isKycVerified,
    handleCheckout,
  };
};

