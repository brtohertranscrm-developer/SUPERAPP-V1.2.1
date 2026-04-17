import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export const useUserDashboard = () => {
  const navigate = useNavigate();
  // Tambahkan 'logout' dari AuthContext jika Anda memilikinya di sana
  const { user, token, updateKycStatus, logout } = useContext(AuthContext) || {}; 
  const authToken = token || localStorage.getItem('token');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [kycStatus, setKycStatus] = useState('unverified'); 
  const [bannerUrl, setBannerUrl] = useState('https://images.unsplash.com/photo-1533105079780-92b9be482077?q=80&w=1600&auto=format&fit=crop');
  const [topTravellers, setTopTravellers] = useState([]); 

  const fetchDashboardData = async () => {
    if (!authToken) { setIsLoading(false); return; }
    try {
      const timestamp = new Date().getTime(); 
      const response = await fetch(`${API_URL}/api/dashboard/me?_t=${timestamp}`, {
        headers: { 'Authorization': `Bearer ${authToken}`, 'Cache-Control': 'no-cache, no-store' }
      });

      // ---> PERBAIKAN 1: TANGANI ERROR 401 (UNAUTHORIZED) <---
      if (response.status === 401 || response.status === 403) {
        console.warn("Token expired atau tidak valid. Mengalihkan ke halaman login...");
        localStorage.removeItem('token'); // Hapus token yang rusak
        if (logout) logout();             // Bersihkan state global jika ada
        navigate('/login');               // Tendang kembali ke login
        return;                           // Hentikan eksekusi kode di bawahnya
      }

      const result = await response.json();
      
      const responseTop = await fetch(`${API_URL}/api/dashboard/top-travellers?_t=${timestamp}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const resultTop = await responseTop.json();

      if (result.success) {
        setDashboardData(result.data);
        if (result.data.user.profile_banner) setBannerUrl(result.data.user.profile_banner);
        const freshKyc = String(result.data.user.kyc_status || 'unverified').toLowerCase();
        setKycStatus(freshKyc);
        if (updateKycStatus) updateKycStatus(freshKyc);
      }
      if (resultTop.success) setTopTravellers(resultTop.data);
    } catch (error) {
      console.error('Gagal mengambil data dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ---> PERBAIKAN 2: BERSIHKAN INTERVAL DENGAN BENAR <---
  useEffect(() => { 
    let isMounted = true;
    let interval; // Simpan ID interval ke variabel

    if (authToken) {
      fetchDashboardData(); 
      interval = setInterval(() => {
        if(isMounted) fetchDashboardData();
      }, 3000);
    } else {
      setIsLoading(false);
      navigate('/login');
    }

    // Fungsi Cleanup: Hentikan interval saat user pindah halaman / logout
    return () => {
      isMounted = false;
      if (interval) clearInterval(interval); 
    };
  }, [authToken, navigate]); 

  // FUNGSI UPDATE KYC CODE (Tetap mempertahankan otomatisasi 'BT-')
  const verifyKycCode = async (accessCode) => {
    try {
      let finalCode = accessCode.trim().toUpperCase();
      if (finalCode.length > 0 && !finalCode.startsWith('BT-')) {
        finalCode = `BT-${finalCode}`;
      }

      const response = await fetch(`${API_URL}/api/users/kyc/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify({ code: finalCode })
      });
      
      const textResult = await response.text();
      let result;
      try {
        result = JSON.parse(textResult);
      } catch (e) {
        return { success: false, error: 'Endpoint API tidak valid (404) atau Server Error.' };
      }

      if (response.ok && result.success) {
        setKycStatus('verified');
        if (updateKycStatus) updateKycStatus('verified');
        fetchDashboardData(); 
        return { success: true };
      }
      return { success: false, error: result.error || 'Kode verifikasi tidak valid / salah.' };
    } catch (error) {
      return { success: false, error: 'Terjadi kesalahan jaringan.' };
    }
  };

  // FUNGSI UPDATE PROFIL
  const saveProfile = async (editForm) => {
    try {
      const response = await fetch(`${API_URL}/api/users/profile`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify(editForm)
      });
      const result = await response.json();
      if (result.success) {
        fetchDashboardData(); 
        return true;
      }
      return false;
    } catch (error) { return false; }
  };

  // FUNGSI UPLOAD BANNER
  const updateBanner = async (base64String) => {
    try {
      await fetch(`${API_URL}/api/users/update-banner`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` }, 
        body: JSON.stringify({ bannerUrl: base64String }) 
      });
    } catch (error) { console.error(error); }
  };

  // FUNGSI PERPANJANG SEWA
  const handleExtend = async (orderId) => {
    const days = prompt("Berapa hari Anda ingin memperpanjang masa sewa?");
    if (!days || isNaN(days) || parseInt(days) <= 0) return;

    try {
      const response = await fetch(`${API_URL}/api/bookings/${orderId}/extend`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify({ additional_days: days })
      });
      const result = await response.json();
      
      if (result.success) {
        alert(`Berhasil! Tanggal kembali menjadi ${result.new_end_date}.\nMohon siapkan pembayaran tambahan Rp ${result.extra_cost.toLocaleString('id-ID')} via transfer/admin lapangan.`);
        fetchDashboardData(); 
      } else {
        alert('Gagal memperpanjang pesanan: ' + result.error);
      }
    } catch (error) {
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
    user: dashboardData?.user || user,
    activeOrder: dashboardData?.activeOrder || null,
    verifyKycCode, 
    saveProfile, 
    updateBanner, 
    navigate,
    handleExtend
  };
};