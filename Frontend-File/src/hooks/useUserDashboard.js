import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { API_BASE_URL } from '../utils/api';

export const useUserDashboard = () => {
  const navigate = useNavigate();
  const { user, token, updateKycStatus, logout } = useContext(AuthContext) || {};
  const authToken = token || localStorage.getItem('token');

  const API_URL = API_BASE_URL;

  const [dashboardData, setDashboardData]     = useState(null);
  const [isLoading, setIsLoading]             = useState(true);
  const [kycStatus, setKycStatus]             = useState('unverified');
  const [bannerUrl, setBannerUrl]             = useState(
    'https://images.unsplash.com/photo-1533105079780-92b9be482077?q=80&w=1600&auto=format&fit=crop'
  );
  const [topTravellers, setTopTravellers]     = useState([]);
  const [partnerVouchers, setPartnerVouchers] = useState([]);
  const [claimedPromos, setClaimedPromos]     = useState([]);
  // [FIX] Index untuk navigasi swipe antar booking aktif
  const [currentOrderIndex, setCurrentOrderIndex] = useState(0);

  const getHeaders = () => ({
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json',
  });

  const fetchDashboardData = async () => {
    if (!authToken) {
      setIsLoading(false);
      return;
    }

    try {
      const timestamp = Date.now();

      const [resMe, resTop, resVouchers, resPromos] = await Promise.all([
        fetch(`${API_URL}/api/dashboard/me?_t=${timestamp}`, { headers: getHeaders() }),
        fetch(`${API_URL}/api/dashboard/top-travellers?_t=${timestamp}`, { headers: getHeaders() }),
        fetch(`${API_URL}/api/users/partner-vouchers?_t=${timestamp}`, { headers: getHeaders() }),
        fetch(`${API_URL}/api/users/promotions?_t=${timestamp}`, { headers: getHeaders() }),
      ]);

      if (resMe.status === 401 || resMe.status === 403) {
        console.warn('Token expired — redirect ke login');
        localStorage.removeItem('token');
        if (logout) logout();
        navigate('/login');
        return;
      }

      const resultMe  = await resMe.json();
      const resultTop = await resTop.json();
      const resultVouchers = await resVouchers.json();
      const resultPromos   = await resPromos.json();

      if (resultMe.success) {
        setDashboardData(resultMe.data);
        if (resultMe.data.user?.profile_banner) {
          setBannerUrl(resultMe.data.user.profile_banner);
        }
        const freshKyc = String(resultMe.data.user?.kyc_status || 'unverified').toLowerCase();
        setKycStatus(freshKyc);
        if (updateKycStatus) updateKycStatus(freshKyc);

        // Reset ke index 0 saat data di-refresh agar tidak out of bounds
        setCurrentOrderIndex(0);
      }

      if (resultTop.success) {
        setTopTravellers(resultTop.data);
      }

      if (resultVouchers.success) {
        setPartnerVouchers(Array.isArray(resultVouchers.data) ? resultVouchers.data : []);
      }
      if (resultPromos.success) {
        setClaimedPromos(Array.isArray(resultPromos.data) ? resultPromos.data : []);
      }
    } catch (error) {
      console.error('Gagal mengambil data dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // 1. Jika tidak ada token, hentikan loading dan jangan paksa navigate ke /login dari dalam hook.
    // Perlindungan Route sebaiknya diatur di tingkat AppRoutes.jsx (ProtectedRoute)
    if (!authToken) {
      setIsLoading(false);
      
      // Mencegah infinite loop: Hanya navigate jika saat ini BUKAN di halaman login
      if (window.location.pathname !== '/login') {
        navigate('/login');
      }
      return;
    }

    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 5_000);

    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchDashboardData();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [authToken, navigate]);
  
  // ── Navigasi booking ────────────────────────────────────────────────────────
  const activeOrders = dashboardData?.activeOrders || [];

  const goToPrevOrder = () => {
    setCurrentOrderIndex(i => Math.max(0, i - 1));
  };
  const goToNextOrder = () => {
    setCurrentOrderIndex(i => Math.min(activeOrders.length - 1, i + 1));
  };

  // ── Helper functions ────────────────────────────────────────────────────────
  const verifyKycCode = async (accessCode) => {
    try {
      let finalCode = accessCode.trim().toUpperCase();
      if (finalCode.length > 0 && !finalCode.startsWith('BT-')) {
        finalCode = `BT-${finalCode}`;
      }

      const response = await fetch(`${API_URL}/api/users/kyc/verify`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ code: finalCode }),
      });

      const textResult = await response.text();
      let result;
      try {
        result = JSON.parse(textResult);
      } catch {
        return { success: false, error: 'Endpoint API tidak valid atau Server Error.' };
      }

      if (response.ok && result.success) {
        setKycStatus('verified');
        if (updateKycStatus) updateKycStatus('verified');
        fetchDashboardData();
        return { success: true };
      }
      return { success: false, error: result.error || 'Kode verifikasi tidak valid.' };
    } catch {
      return { success: false, error: 'Terjadi kesalahan jaringan.' };
    }
  };

  const saveProfile = async (editForm) => {
    try {
      const response = await fetch(`${API_URL}/api/profile`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(editForm),
      });
      const result = await response.json();
      if (result.success) {
        fetchDashboardData();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const updateBanner = async (base64String) => {
    try {
      await fetch(`${API_URL}/api/users/update-banner`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ bannerUrl: base64String }),
      });
    } catch (error) {
      console.error('Gagal update banner:', error);
    }
  };

  const handleExtend = async (orderId) => {
    const days = prompt('Berapa hari Anda ingin memperpanjang masa sewa?');
    if (!days || isNaN(days) || parseInt(days) <= 0) return;

    try {
      const response = await fetch(`${API_URL}/api/bookings/${orderId}/extend`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ additional_days: days }),
      });
      const result = await response.json();

      if (result.success) {
        alert(
          `Berhasil! Tanggal kembali menjadi ${result.new_end_date}.\n` +
          `Mohon siapkan pembayaran tambahan Rp ${result.extra_cost.toLocaleString('id-ID')}.`
        );
        fetchDashboardData();
      } else {
        alert('Gagal memperpanjang pesanan: ' + result.error);
      }
    } catch {
      alert('Terjadi kesalahan jaringan.');
    }
  };

  return {
    dashboardData,
    isLoading,
    kycStatus,
    bannerUrl,
    setBannerUrl,
    topTravellers,
    partnerVouchers,
    claimedPromos,
    user:               dashboardData?.user || user,
    // [FIX] activeOrders = semua booking aktif, activeOrder = booking yang sedang ditampilkan
    activeOrders,
    activeOrder:        activeOrders[currentOrderIndex] || null,
    currentOrderIndex,
    totalOrders:        activeOrders.length,
    goToPrevOrder,
    goToNextOrder,
    verifyKycCode,
    saveProfile,
    updateBanner,
    navigate,
    handleExtend,
  };
};
