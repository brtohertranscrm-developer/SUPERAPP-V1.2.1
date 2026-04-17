import { useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export const usePayment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token } = useContext(AuthContext) || {};
  const authToken = token || localStorage.getItem('token');

  const { orderData } = location.state || {};

  const [paymentMethod, setPaymentMethod] = useState('bank_bca'); 
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

  // Proteksi Halaman
  useEffect(() => {
    if (!orderData || !user) {
      navigate('/');
    }
  }, [orderData, user, navigate]);

  const handlePayment = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    
    try {
      // 1. Simulasi jeda verifikasi Bank/E-Wallet
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 2. Tembak API
      const response = await fetch(`${API_URL}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(orderData)
      });

      const result = await response.json();

      if (result.success) {
        setIsProcessing(false);
        setIsSuccess(true);
        
        // 3. Jeda di layar sukses sebelum dilempar
        setTimeout(() => {
          navigate('/trip-history'); 
        }, 3000);
      } else {
        alert(`Gagal menyimpan pesanan: ${result.error}`);
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('Payment Error:', error);
      alert('Terjadi kesalahan jaringan saat memproses pembayaran.');
      setIsProcessing(false);
    }
  };

  return {
    user, orderData,
    paymentMethod, setPaymentMethod,
    isProcessing, isSuccess,
    handlePayment
  };
};