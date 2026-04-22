import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  DEFAULT_PICKUP_TIME,
  DEFAULT_RETURN_TIME,
} from '../utils/motorRentalPricing';

export const useSearchPage = () => {
  const location  = useLocation();
  const navigate  = useNavigate();
  const initialSearchData = location.state || {};

  const [activeSearch, setActiveSearch] = useState({
    pickupLocation: initialSearchData.pickupLocation || 'Yogyakarta',
    startDate:      initialSearchData.startDate      || '',
    startTime:      initialSearchData.startTime      || DEFAULT_PICKUP_TIME,
    endDate:        initialSearchData.endDate        || '',
    endTime:        initialSearchData.endTime        || DEFAULT_RETURN_TIME,
  });

  const [isEditing, setIsEditing] = useState(false);
  const [formData,  setFormData]  = useState({ ...activeSearch });
  const [motors,    setMotors]    = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState(null);

  const API_URL = import.meta.env.VITE_API_URL?.trim() || '';

  useEffect(() => {
    if (!activeSearch.startDate || !activeSearch.endDate) {
      navigate('/');
    }
  }, [activeSearch, navigate]);

  useEffect(() => {
    if (!activeSearch.startDate || !activeSearch.endDate) return;

    setIsLoading(true);
    setError(null);

    const startDateTime = `${activeSearch.startDate}T${activeSearch.startTime || DEFAULT_PICKUP_TIME}:00`;
    const endDateTime = `${activeSearch.endDate}T${activeSearch.endTime || DEFAULT_RETURN_TIME}:00`;
    const qs = new URLSearchParams({
      start_date: startDateTime,
      end_date: endDateTime,
    }).toString();

    fetch(`${API_URL}/api/motors?${qs}`)
      .then(res => {
        if (!res.ok) throw new Error('Gagal terhubung ke server');
        return res.json();
      })
      .then(data => {
        if (data.success) {
          // Filter berdasarkan kota yang dipilih
          const city = activeSearch.pickupLocation;
          const filtered = data.data.filter(m => {
            if ((Number(m?.stock) || 0) <= 0) return false;
            const loc = (m.location || '').toLowerCase();
            if (city === 'Solo') return loc.includes('solo') || loc.includes('balapan');
            // Yogyakarta = semua yang bukan Solo
            return !loc.includes('solo') && !loc.includes('balapan');
          });
          setMotors(filtered);
        } else {
          setError(data.error);
        }
        setIsLoading(false);
      })
      .catch(() => {
        setError('Koneksi ke server terputus. Pastikan Backend aktif.');
        setIsLoading(false);
      });
  }, [activeSearch, API_URL]);

  const handleUpdateSearch = (e) => {
    e.preventDefault();
    if (!formData.startDate || !formData.endDate || !formData.startTime || !formData.endTime) {
      alert('Mohon lengkapi tanggal dan jam!');
      return;
    }
    setActiveSearch(formData);
    setIsEditing(false);
    navigate('.', { state: formData, replace: true });
  };

  const handleRent = (motor) => {
    navigate('/checkout-motor', {
      state: {
        motorId:        motor.id,
        motorName:      motor.display_name || motor.public_name || motor.name,
        pickupLocation: activeSearch.pickupLocation,
        startDate:      activeSearch.startDate,
        startTime:      activeSearch.startTime,
        endDate:        activeSearch.endDate,
        endTime:        activeSearch.endTime,
        price24h:       motor.current_price || motor.base_price || 0,
        price12h:       motor.current_price_12h || motor.price_12h || Math.round((motor.current_price || motor.base_price || 0) * 0.7),
      }
    });
  };

  const formatDate = (dateStr, timeStr) => {
    if (!dateStr) return '';
    const formattedDate = new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
    return timeStr ? `${formattedDate} ${timeStr}` : formattedDate;
  };

  return {
    activeSearch,
    isEditing, setIsEditing,
    formData,  setFormData,
    motors, isLoading, error,
    handleUpdateSearch, handleRent, formatDate,
  };
};
