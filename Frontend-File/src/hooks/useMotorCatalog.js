import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { DEFAULT_PICKUP_TIME, DEFAULT_RETURN_TIME } from '../utils/motorRentalPricing';

export const useMotorCatalog = () => {
  const navigate  = useNavigate();
  const searchRef = useRef(null);

  const [searchParams, setSearchParams] = useState({
    location:  'Yogyakarta',
    startDate: '',
    startTime: DEFAULT_PICKUP_TIME,
    endDate:   '',
    endTime:   DEFAULT_RETURN_TIME,
  });

  const [activeFilter, setActiveFilter] = useState('Semua');
  const [motors,    setMotors]    = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState(null);

  const API_URL = import.meta.env.VITE_API_URL?.trim() || '';

  useEffect(() => {
    fetch(`${API_URL}/api/motors`)
      .then(res => {
        if (!res.ok) throw new Error('Gagal terhubung ke server');
        return res.json();
      })
      .then(data => {
        if (data.success) setMotors(data.data);
        else setError(data.error);
        setIsLoading(false);
      })
      .catch(() => {
        setError('Gagal mengambil data dari server. Pastikan Backend menyala.');
        setIsLoading(false);
      });
  }, [API_URL]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchParams.startDate || !searchParams.endDate) {
      alert('Tentukan tanggal perjalanan Anda terlebih dahulu.');
      return;
    }
    navigate('/search-page', {
      state: {
        startDate:      searchParams.startDate,
        startTime:      searchParams.startTime,
        endDate:        searchParams.endDate,
        endTime:        searchParams.endTime,
        pickupLocation: searchParams.location,
      }
    });
  };

  const handleCardClick = () => {
    searchRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // Filter by kota (Yogyakarta / Solo) atau Semua
  const displayedMotors = motors.filter(motor => {
    if (activeFilter === 'Semua') return true;
    // normalize lokasi motor dari DB
    const loc = (motor.location || '').toLowerCase();
    if (activeFilter === 'Solo') return loc.includes('solo') || loc.includes('balapan');
    if (activeFilter === 'Yogyakarta') return !loc.includes('solo') && !loc.includes('balapan');
    return true;
  });

  return {
    searchParams, setSearchParams,
    activeFilter, setActiveFilter,
    isLoading, error, displayedMotors,
    handleSearchSubmit, handleCardClick, searchRef,
  };
};
