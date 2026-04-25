import { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL?.trim() || '';

export const usePaymentInfo = () => {
  const [paymentInfo, setPaymentInfo] = useState(null);

  useEffect(() => {
    let isMounted = true;
    fetch(`${API_URL}/api/payment-info`)
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

  return { paymentInfo };
};

