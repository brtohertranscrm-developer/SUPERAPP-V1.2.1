import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export const useRewards = () => {
  const navigate = useNavigate();
  const { token } = useContext(AuthContext) || {};
  const authToken = token || localStorage.getItem('token');

  const [currentMiles, setCurrentMiles] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRedeeming, setIsRedeeming] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL?.trim() || '';

  // Fetch Saldo Miles Real dari Database
  useEffect(() => {
    const fetchMiles = async () => {
      try {
        const response = await fetch(`${API_URL}/api/dashboard/me`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const result = await response.json();
        if (result.success) setCurrentMiles(result.data.user.miles || 0);
      } catch (error) {
        console.error('Gagal fetch miles');
      } finally {
        setIsLoading(false);
      }
    };
    if (authToken) fetchMiles();
  }, [authToken, API_URL]);

  // Fungsi Tukar Reward
  const handleRedeem = async (reward) => {
    if (!window.confirm(`Tukar ${reward.cost} Miles untuk "${reward.title}"?`)) return;

    setIsRedeeming(true);
    try {
      const response = await fetch(`${API_URL}/api/rewards/redeem`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ cost: reward.cost, title: reward.title })
      });
      const result = await response.json();

      if (result.success) {
        alert(result.message);
        setCurrentMiles(result.newMiles); // Update saldo di UI
        
        // Update LocalStorage agar sinkron
        const stored = JSON.parse(localStorage.getItem('user'));
        if (stored) {
          localStorage.setItem('user', JSON.stringify({ ...stored, miles: result.newMiles }));
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

  return {
    navigate,
    currentMiles,
    isLoading,
    isRedeeming,
    handleRedeem
  };
};