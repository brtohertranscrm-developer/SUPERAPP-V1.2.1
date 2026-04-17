import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export const useTripHistory = () => {
  const { user, token } = useContext(AuthContext) || {};
  const authToken = token || localStorage.getItem('token');
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

  // Proteksi Halaman
  useEffect(() => {
    if (!user && !isLoading) {
      navigate('/login');
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!authToken) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/users/history`, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        const result = await response.json();

        if (result.success) {
          setBookings(result.data);
        } else {
          throw new Error(result.error);
        }
      } catch (err) {
        console.error('Fetch error:', err);
        setError('Gagal memuat riwayat perjalanan. Pastikan server menyala.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [authToken, API_URL]);

  return {
    user, navigate,
    bookings, isLoading, error,
    selectedTicket, setSelectedTicket
  };
};