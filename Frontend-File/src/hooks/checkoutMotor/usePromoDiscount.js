import { useCallback, useMemo, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL?.trim() || '';

export const usePromoDiscount = ({ subTotal, beforeDiscount }) => {
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [isCheckingPromo, setIsCheckingPromo] = useState(false);

  const safeDiscount = useMemo(() => {
    const safe = Math.min(
      Math.max(0, Number(discountAmount) || 0),
      Number(beforeDiscount) || 0
    );
    return safe;
  }, [discountAmount, beforeDiscount]);

  const handleApplyPromo = useCallback(
    async (code) => {
      setIsCheckingPromo(true);
      try {
        const res = await fetch(`${API_URL}/api/promotions/validate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });
        const result = await res.json();

        if (result.success && result.data) {
          const promo = result.data;
          const rawDiscount = Math.floor(
            (Number(subTotal) * (promo.discount_percent || 0)) / 100
          );
          const capped =
            promo.max_discount > 0
              ? Math.min(rawDiscount, promo.max_discount)
              : rawDiscount;
          setAppliedPromo(promo);
          setDiscountAmount(capped);
          return { success: true };
        }
        return {
          success: false,
          error: result.error || 'Kode promo tidak valid.',
        };
      } catch {
        return { success: false, error: 'Gagal terhubung ke server.' };
      } finally {
        setIsCheckingPromo(false);
      }
    },
    [subTotal]
  );

  const handleRemovePromo = useCallback(() => {
    setAppliedPromo(null);
    setDiscountAmount(0);
  }, []);

  return {
    appliedPromo,
    safeDiscount,
    isCheckingPromo,
    handleApplyPromo,
    handleRemovePromo,
  };
};

