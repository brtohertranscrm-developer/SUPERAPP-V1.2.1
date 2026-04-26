import { useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export const usePayment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { orderId: orderIdParam } = useParams();
  const { user, token } = useContext(AuthContext) || {};
  const authToken = token || localStorage.getItem('token');

  const { orderData: orderDataFromState } = location.state || {};

  const [orderData, setOrderData] = useState(orderDataFromState || null);
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL?.trim() || '';

  // Proteksi Halaman + load data
  useEffect(() => {
    const run = async () => {
      if (!user) {
        navigate('/login', { replace: true });
        return;
      }

      try {
        setIsLoading(true);

        const paymentInfoReq = fetch(`${API_URL}/api/payment-info`)
          .then((r) => r.json())
          .then((data) => { if (data?.success) setPaymentInfo(data.data); });

        if (orderIdParam) {
          const res = await fetch(`${API_URL}/api/bookings/${orderIdParam}`, {
            headers: { Authorization: `Bearer ${authToken}` },
          });
          const data = await res.json();
          if (data?.success && data?.data) {
            setOrderData({ ...(orderDataFromState || {}), ...data.data });
          } else if (orderDataFromState) {
            setOrderData(orderDataFromState);
          } else {
            navigate('/dashboard', { replace: true });
          }
          await paymentInfoReq;
          return;
        }

        if (orderDataFromState) {
          await paymentInfoReq;
          setOrderData(orderDataFromState);
          return;
        }

        navigate('/dashboard', { replace: true });
      } finally {
        setIsLoading(false);
      }
    };

    run().catch(() => {
      setIsLoading(false);
      navigate('/dashboard', { replace: true });
    });
  }, [user, navigate, API_URL, orderIdParam, authToken, orderDataFromState]);

  return {
    user,
    orderData,
    paymentInfo,
    isLoading,
  };
};
