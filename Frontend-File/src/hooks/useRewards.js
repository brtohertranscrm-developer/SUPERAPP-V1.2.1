import { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { apiFetch } from '../utils/api';

export const useRewards = () => {
  const navigate = useNavigate();
  const { token } = useContext(AuthContext) || {};
  const authToken = token || localStorage.getItem('token');

  const [currentMiles, setCurrentMiles] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [rewards, setRewards] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [isLoadingVouchers, setIsLoadingVouchers] = useState(false);

  // Modal state
  const [confirmReward, setConfirmReward] = useState(null);   // reward yg sedang dikonfirmasi
  const [successVoucher, setSuccessVoucher] = useState(null); // voucher yg baru dibuat
  const [newVoucherCode, setNewVoucherCode] = useState('');   // highlight di list

  useEffect(() => {
    if (!authToken) {
      setIsLoading(false);
      navigate('/login', { replace: true });
      return;
    }

    const fetchMiles = async () => {
      try {
        const result = await apiFetch('/api/dashboard/me');
        if (result?.success) setCurrentMiles(result?.data?.user?.miles || 0);
      } catch {
        // silent
      } finally {
        setIsLoading(false);
      }
    };
    fetchMiles();
  }, [authToken, navigate]);

  useEffect(() => {
    const fetchRewards = async () => {
      try {
        const result = await apiFetch('/api/miles/rewards');
        if (result?.success) setRewards(Array.isArray(result.data) ? result.data : []);
      } catch {
        setRewards([]);
      }
    };
    if (authToken) fetchRewards();
  }, [authToken]);

  const fetchVouchers = useCallback(async () => {
    if (!authToken) return;
    setIsLoadingVouchers(true);
    try {
      const result = await apiFetch('/api/miles/vouchers');
      if (result?.success) setVouchers(Array.isArray(result.data) ? result.data : []);
    } catch {
      setVouchers([]);
    } finally {
      setIsLoadingVouchers(false);
    }
  }, [authToken]);

  useEffect(() => {
    void fetchVouchers();
  }, [fetchVouchers]);

  const refreshMiles = useCallback(async () => {
    try {
      const result = await apiFetch('/api/dashboard/me');
      if (result?.success) setCurrentMiles(result?.data?.user?.miles || 0);
    } catch {}
  }, []);

  // Step 1: user klik "Tukar" → tampilkan modal konfirmasi
  const handleRedeem = (reward) => {
    if (!reward?.id) return;
    setConfirmReward(reward);
  };

  // Step 2: user konfirmasi di modal → proses ke server
  const handleConfirmRedeem = useCallback(async () => {
    const reward = confirmReward;
    if (!reward?.id) return;

    setIsRedeeming(true);
    try {
      const idemKey =
        (typeof crypto !== 'undefined' && crypto.randomUUID)
          ? crypto.randomUUID()
          : `redeem-${Date.now()}-${Math.random().toString(16).slice(2)}`;

      const result = await apiFetch('/api/miles/redeem', {
        method: 'POST',
        body: JSON.stringify({ reward_id: reward.id, idempotency_key: idemKey }),
      });

      if (result.success) {
        setCurrentMiles(result.newMiles);
        await fetchVouchers();

        const stored = JSON.parse(localStorage.getItem('user'));
        if (stored) {
          localStorage.setItem('user', JSON.stringify({ ...stored, miles: result.newMiles }));
        }

        const code = result.voucher_code ? String(result.voucher_code) : '';
        setConfirmReward(null);

        // Tampilkan success modal dengan data voucher lengkap
        setSuccessVoucher({
          voucher_code: code,
          title: reward.title,
          discount_percent: reward.discount_percent,
          max_discount: reward.max_discount,
          expires_at: result.expires_at || null,
        });
        setNewVoucherCode(code);

        // Auto-copy ke clipboard (silent)
        if (code) {
          navigator.clipboard.writeText(code).catch(() => {});
        }
      } else {
        setConfirmReward(null);
        // Tampilkan error via state bukan alert
        setRedeemError(result.error || 'Gagal menukar miles.');
      }
    } catch {
      setConfirmReward(null);
      setRedeemError('Gagal terhubung ke server.');
    } finally {
      setIsRedeeming(false);
    }
  }, [confirmReward, fetchVouchers]);

  const [redeemError, setRedeemError] = useState('');

  const handleCancelVoucher = useCallback(async (voucherCode) => {
    if (!voucherCode) return;
    try {
      const result = await apiFetch(`/api/miles/vouchers/${encodeURIComponent(voucherCode)}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'user_cancel' }),
      });
      if (result?.success) {
        setCurrentMiles(result.newMiles);
        const stored = JSON.parse(localStorage.getItem('user'));
        if (stored) localStorage.setItem('user', JSON.stringify({ ...stored, miles: result.newMiles }));
        await fetchVouchers();
        return { success: true, message: result.message };
      } else {
        return { success: false, message: result?.error || 'Gagal membatalkan voucher.' };
      }
    } catch (e) {
      return { success: false, message: e?.message || 'Gagal membatalkan voucher.' };
    } finally {
      void refreshMiles();
    }
  }, [fetchVouchers, refreshMiles]);

  const dismissSuccessVoucher = useCallback(() => {
    setSuccessVoucher(null);
  }, []);

  const dismissError = useCallback(() => setRedeemError(''), []);

  return {
    navigate,
    currentMiles,
    isLoading,
    isRedeeming,
    rewards,
    vouchers,
    isLoadingVouchers,
    handleRedeem,
    handleConfirmRedeem,
    handleCancelVoucher,
    confirmReward,
    setConfirmReward,
    successVoucher,
    dismissSuccessVoucher,
    newVoucherCode,
    redeemError,
    dismissError,
  };
};
