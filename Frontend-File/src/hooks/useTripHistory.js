import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export const useTripHistory = () => {
  const { user, token } = useContext(AuthContext) || {};
  const authToken = token || localStorage.getItem('token');
  const navigate  = useNavigate();

  const [bookings,        setBookings]        = useState([]);
  const [isLoading,       setIsLoading]       = useState(true);
  const [error,           setError]           = useState(null);
  const [selectedTicket,  setSelectedTicket]  = useState(null);

  const API_URL = import.meta.env.VITE_API_URL?.trim() || '';

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const fetchHistory = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // FIX: endpoint yang benar sesuai userRoutes.js
        // route didaftarkan sebagai router.get('/users/history')
        // di-mount di app.use('/api', userRoutes) → full path: /api/users/history
        const res = await fetch(`${API_URL}/api/users/history`, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        });

        const result = await res.json();

        if (!res.ok || !result.success) {
          throw new Error(result.error || `HTTP ${res.status}`);
        }

        setBookings(result.data || []);
      } catch (err) {
        console.error('Fetch trip history error:', err);
        setError('Gagal memuat riwayat perjalanan. Pastikan server menyala.');
      } finally {
        setIsLoading(false);
      }
    };

    if (authToken) {
      fetchHistory();
    } else {
      setIsLoading(false);
      navigate('/login');
    }
  }, [authToken, user, navigate, API_URL]);

  return {
    user,
    navigate,
    bookings,
    isLoading,
    error,
    selectedTicket,
    setSelectedTicket,
  };
};
