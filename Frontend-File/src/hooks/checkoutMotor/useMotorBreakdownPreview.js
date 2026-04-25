import { useEffect, useMemo, useState } from 'react';
import { calculateMotorRentalBreakdown } from '../../utils/motorRentalPricing';

const API_URL = import.meta.env.VITE_API_URL?.trim() || '';

export const useMotorBreakdownPreview = (bookingData) => {
  const {
    startDate = '',
    startTime = '09:00',
    endDate = '',
    endTime = '09:00',
    price24h = 0,
    price12h = Math.round((Number(price24h) || 0) * 0.7),
  } = bookingData || {};

  const localBreakdown = useMemo(
    () =>
      calculateMotorRentalBreakdown({
        startDate,
        startTime,
        endDate,
        endTime,
        price24h,
        price12h,
      }),
    [startDate, startTime, endDate, endTime, price24h, price12h]
  );

  const [remoteBreakdown, setRemoteBreakdown] = useState(null);
  const [_isBreakdownLoading, setIsBreakdownLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    if (!bookingData) {
      setRemoteBreakdown(null);
      setIsBreakdownLoading(false);
      return () => {
        isMounted = false;
      };
    }

    setIsBreakdownLoading(true);
    fetch(`${API_URL}/api/pricing/motor-breakdown`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startDate,
        startTime,
        endDate,
        endTime,
        price24h,
        price12h,
      }),
    })
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        if (!isMounted) return;
        if (ok && j?.success && j?.data) setRemoteBreakdown(j.data);
        else setRemoteBreakdown(null);
      })
      .catch(() => {
        if (isMounted) setRemoteBreakdown(null);
      })
      .finally(() => {
        if (isMounted) setIsBreakdownLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [bookingData, startDate, startTime, endDate, endTime, price24h, price12h]);

  return {
    rentalBreakdown: remoteBreakdown || localBreakdown,
    startDate,
    startTime,
    endDate,
    endTime,
    price24h,
    price12h,
  };
};

