import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export const useSearchPage = () => {
  const location  = useLocation();
  const navigate  = useNavigate();
  const initialSearchData = location.state || {};

  const [activeSearch, setActiveSearch] = useState({
    pickupLocation: initialSearchData.pickupLocation || 'Yogyakarta',
    startDate:      initialSearchData.startDate      || '',
    endDate:        initialSearchData.endDate        || '',
  });

  const [isEditing, setIsEditing] = useState(false);
  const [formData,  setFormData]  = useState({ ...activeSearch });
  const [motors,    setMotors]    = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

  useEffect(() => {
    if (!activeSearch.startDate || !activeSearch.endDate) {
      navigate('/');
    }
  }, [activeSearch, navigate]);

  useEffect(() => {
    if (!activeSearch.startDate || !activeSearch.endDate) return;

    setIsLoading(true);
    setError(null);

    fetch(`${API_URL}/api/motors`)
      .then(res => {
        if (!res.ok) throw new Error('Gagal terhubung ke server');
        return res.json();
      })
      .then(data => {
        if (data.success) {
          // Filter berdasarkan kota yang dipilih
          const city = activeSearch.pickupLocation;
          const filtered = data.data.filter(m => {
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
    if (!formData.startDate || !formData.endDate) {
      alert('Mohon lengkapi tanggal!');
      return;
    }
    setActiveSearch(formData);
    setIsEditing(false);
    navigate('.', { state: formData, replace: true });
  };

  const handleRent = (motor, activePrice) => {
    const start = new Date(activeSearch.startDate);
    const end   = new Date(activeSearch.endDate);
    const diff  = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    const days  = (!isNaN(diff) && diff >= 1) ? diff : 1;
    const price = activePrice || motor.current_price || motor.base_price;

    navigate('/checkout-motor', {
      state: {
        motorId:        motor.id,
        motorName:      motor.name,
        pickupLocation: activeSearch.pickupLocation,
        startDate:      activeSearch.startDate,
        endDate:        activeSearch.endDate,
        totalDays:      days,
        basePrice:      price,
      }
    });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  };

  return {
    activeSearch,
    isEditing, setIsEditing,
    formData,  setFormData,
    motors, isLoading, error,
    handleUpdateSearch, handleRent, formatDate,
  };
};
