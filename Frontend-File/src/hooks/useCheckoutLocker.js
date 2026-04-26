import { useState, useContext, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { apiFetch } from '../utils/api';

export const useCheckoutLocker = () => {
  // Ambil konteks dengan fallback yang lebih aman
  const authContext = useContext(AuthContext);
  const user = authContext?.user || null; 
  const updateKycStatus = authContext?.updateKycStatus;

  const navigate = useNavigate();
  const location = useLocation();

  const passedData = location.state || {};
  
  const [startDate, setStartDate] = useState(passedData.startDate || '');
  const [endDate, setEndDate] = useState(passedData.endDate || '');
  const [lockerSize, setLockerSize] = useState(passedData.size || 'Medium');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Normalisasi lokasi ke nama kota
  const rawLoc = passedData.location || '';
  const lockerLocation = rawLoc.toLowerCase().includes('solo') || rawLoc.toLowerCase().includes('balapan')
    ? 'Solo'
    : 'Yogyakarta';
  
  const priceMap = { Medium: 25000, Large: 40000 };
  const basePrice = priceMap[lockerSize] || 25000; // Fallback default
  
  // Kalkulasi total hari dengan validasi Date yang aman
  let totalDays = 1;
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Pastikan tanggal valid (bukan NaN) sebelum dihitung
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      totalDays = diffDays > 0 ? diffDays : 1;
    }
  }

  const totalPrice = basePrice * totalDays;

  // Efek pengecekan otentikasi
  useEffect(() => {
    // Jika benar-benar belum login, arahkan ke halaman login
    if (user === null) {
      // Membawa state data sebelumnya agar tidak hilang setelah login (opsional)
      navigate('/login', { 
        state: { 
            from: location.pathname, 
            ...passedData 
        },
        replace: true 
      });
    }
  }, [user, navigate, location.pathname, passedData]);

  // Perbaikan penulisan key dari database/context (kyc_status)
  const kycRaw = user?.kyc_status ?? user?.kycStatus ?? '';
  const isKycApproved = String(kycRaw || '').trim().toLowerCase() === 'verified';

  // Refresh ringan agar status KYC tidak stale setelah admin verifikasi
  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        const resultMe = await apiFetch('/api/dashboard/me');
        const fresh = String(resultMe?.data?.user?.kyc_status || '').toLowerCase();
        const current = String(user?.kyc_status || '').toLowerCase();
        if (!mounted) return;
        if (fresh && updateKycStatus && fresh !== current) updateKycStatus(fresh);
      } catch {
        // best-effort refresh; ignore network errors
      }
    };
    if (user) void run();
    return () => { mounted = false; };
  }, [user, updateKycStatus]);

  const handlePayment = () => {
    setIsProcessing(true);
    const orderData = {
      order_id: `TRX-LKR-${Date.now()}`, 
      item_type: 'loker', 
      item_name: `Smart Loker ${lockerSize}`,
      location: lockerLocation,
      start_date: startDate,
      end_date: endDate,
      total_price: totalPrice,
      display_duration: `${totalDays} Hari`
    };

    setTimeout(() => {
      setIsProcessing(false);
      navigate('/payment', { state: { orderData } });
    }, 800);
  };

  return {
    user, navigate,
    startDate, setStartDate,
    endDate, setEndDate,
    lockerSize, setLockerSize,
    lockerLocation, basePrice, totalDays, totalPrice,
    isKycApproved, isProcessing,
    handlePayment
  };
};
