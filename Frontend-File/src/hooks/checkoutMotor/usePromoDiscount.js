import { useCallback, useMemo, useState } from 'react';
import { apiFetch } from '../../utils/api';

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
        const result = await apiFetch('/api/promotions/validate', {
          method: 'POST',
          body: JSON.stringify({ code }),
        });

        if (result?.success && result?.data) {
          const promo = result.data;
          const rewardType = String(promo.reward_type || promo.type || '').toLowerCase();
          const fixedAmount = Number(promo.discount_amount) || 0;
          const base = Number(subTotal) || 0;
          const rawDiscount = rewardType === 'fixed'
            ? Math.max(0, fixedAmount)
            : Math.floor((base * (promo.discount_percent || 0)) / 100);
          const cap = rewardType === 'fixed'
            ? rawDiscount
            : (promo.max_discount > 0 ? Math.min(rawDiscount, promo.max_discount) : rawDiscount);
          const capped = Math.min(cap, Number(beforeDiscount) || base);
          setAppliedPromo(promo);
          setDiscountAmount(capped);
          return { success: true };
        }
        return {
          success: false,
          error: result?.error || 'Kode promo tidak valid.',
        };
      } catch (e) {
        return { success: false, error: e?.message || 'Gagal terhubung ke server.' };
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
