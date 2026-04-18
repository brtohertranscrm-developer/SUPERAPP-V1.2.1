import { useState, useContext, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export const useCheckoutLocker = () => {
  const { user } = useContext(AuthContext) || {};
  const navigate = useNavigate();
  const location = useLocation();

  const passedData = location.state || {};
  
  const [startDate, setStartDate] = useState(passedData.startDate || '');
  const [endDate, setEndDate] = useState(passedData.endDate || '');
  const [lockerSize, setLockerSize] = useState(passedData.size || 'Medium');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // FIX: normalize ke nama kota saja
  const rawLoc = passedData.location || '';
  const lockerLocation = rawLoc.toLowerCase().includes('solo') || rawLoc.toLowerCase().includes('balapan')
    ? 'Solo'
    : 'Yogyakarta';
  
  const priceMap = { Medium: 25000, Large: 40000 };
  const basePrice = priceMap[lockerSize];
  
  let totalDays = 1;
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    totalDays = diffDays > 0 ? diffDays : 1;
  }

  const totalPrice = basePrice * totalDays;

  useEffect(() => {
    if (!user) navigate('/');
  }, [user, navigate]);

  const isKycApproved = user?.kycStatus === 'approved';

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