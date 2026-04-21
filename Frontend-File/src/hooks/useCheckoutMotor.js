import { useState, useEffect, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export const useCheckoutMotor = () => {
  const { user } = useContext(AuthContext) || {};
  const location = useLocation();
  const navigate = useNavigate();
  
  const bookingData = location.state;

  const [isLoading, setIsLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('qris');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

  // Proteksi URL Akses Langsung
  useEffect(() => {
    if (!bookingData) {
      navigate('/');
    }
  }, [bookingData, navigate]);

  // Proteksi Belum Login
  useEffect(() => {
    if (!user && bookingData) {
      sessionStorage.setItem('pending_checkout', JSON.stringify(bookingData));
      alert('Silakan login terlebih dahulu untuk melanjutkan pesanan.');
      navigate('/login');
    }
  }, [user, bookingData, navigate]);

  if (!bookingData || !user) return { isReady: false }; 

  // Kalkulasi Harga
  const totalDays = bookingData?.totalDays || 1;
  const basePrice = bookingData?.basePrice || 0;

  const subTotal = basePrice * totalDays;
  const adminFee = 2500;
  const grandTotal = subTotal + adminFee;

  // UPDATED: Menerima parameter rincian diskon dari komponen CheckoutMotor
  const handleCheckout = async (checkoutDetails = {}) => {
    setIsLoading(true);
    const token = localStorage.getItem('token'); 

    const date = new Date();
    const orderId = `BTM-${date.getFullYear()}${(date.getMonth()+1).toString().padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

    // UPDATED: Masukkan SEMUA rincian harga ke dalam payload
    const payload = {
      order_id: orderId,
      item_type: 'motor',
      item_name: bookingData.motorName,
      location: bookingData.pickupLocation,
      start_date: bookingData.startDate,
      end_date: bookingData.endDate,
      
      // Rincian Harga
      base_price: subTotal,
      service_fee: adminFee,
      discount_amount: checkoutDetails.discountAmount || 0,
      promo_code: checkoutDetails.appliedPromo?.code || null,
      total_price: checkoutDetails.finalPrice || grandTotal
    };

    try {
      const res = await fetch(`${API_URL}/api/bookings`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        setTimeout(() => {
          setIsLoading(false);
          navigate('/dashboard', { state: { successMessage: 'Pembayaran berhasil! Motor siap diambil.' } });
        }, 2000);
      } else {
        alert('Gagal memproses pesanan: ' + data.error);
        setIsLoading(false);
      }
    } catch (error) {
      alert('Koneksi ke server gagal.');
      setIsLoading(false);
    }
  };

  return {
    isReady: true,
    user, navigate,
    bookingData,
    isLoading,
    paymentMethod, setPaymentMethod,
    subTotal, adminFee, grandTotal,
    handleCheckout
  };
};
