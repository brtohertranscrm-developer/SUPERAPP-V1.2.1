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

  // Fetch Saldo Miles Real dari Database
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
      } catch (error) {
        console.error('Gagal fetch miles');
      } finally {
        setIsLoading(false);
      }
    };
    fetchMiles();
  }, [authToken, navigate]);

  // Fetch katalog rewards + voucher list
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

  // Fungsi Tukar Reward
  const handleRedeem = async (reward) => {
    if (!reward?.id) return;
    const cost = reward?.miles_cost ?? reward?.cost ?? 0;
    if (!window.confirm(`Tukar ${cost} Miles untuk "${reward.title}"?`)) return;

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
        
        // Update LocalStorage agar sinkron
        const stored = JSON.parse(localStorage.getItem('user'));
        if (stored) {
          localStorage.setItem('user', JSON.stringify({ ...stored, miles: result.newMiles }));
        }

        const code = result.voucher_code ? String(result.voucher_code) : '';
        if (code) {
          try {
            await navigator.clipboard.writeText(code);
            alert(`Voucher berhasil dibuat: ${code}\n\nKode sudah disalin. Kamu bisa pasang di checkout via "Kode Promo".`);
          } catch {
            alert(`Voucher berhasil dibuat: ${code}\n\nSalin kode ini dan pasang di checkout via "Kode Promo".`);
          }
        } else {
          alert(result.message || 'Berhasil menukar Miles.');
        }
      } else {
        alert(result.error || 'Gagal menukar miles.');
      }
    } catch (error) {
      alert('Gagal terhubung ke server');
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleCancelVoucher = useCallback(async (voucherCode) => {
    if (!voucherCode) return;
    if (!window.confirm('Batalkan voucher ini dan refund Miles? (hanya bisa dalam 5 menit dan jika belum dipakai)')) return;
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
        alert(result.message || 'Voucher dibatalkan.');
      } else {
        alert(result?.error || 'Gagal membatalkan voucher.');
      }
    } catch (e) {
      alert(e?.message || 'Gagal membatalkan voucher.');
    } finally {
      void refreshMiles();
    }
  }, [fetchVouchers, refreshMiles]);

  return {
    navigate,
    currentMiles,
    isLoading,
    isRedeeming,
    rewards,
    vouchers,
    isLoadingVouchers,
    handleRedeem,
    handleCancelVoucher,
  };
};
