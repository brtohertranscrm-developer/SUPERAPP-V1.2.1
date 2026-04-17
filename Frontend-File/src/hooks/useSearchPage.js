import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export const useSearchPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const initialSearchData = location.state || {};

  const [activeSearch, setActiveSearch] = useState({
    pickupLocation: initialSearchData.pickupLocation || 'Stasiun Lempuyangan',
    startDate: initialSearchData.startDate || '',
    endDate: initialSearchData.endDate || ''
  });

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ ...activeSearch });

  const [motors, setMotors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

  // Redirect jika tidak ada tanggal
  useEffect(() => {
    if (!activeSearch.startDate || !activeSearch.endDate) {
      navigate('/');
    }
  }, [activeSearch, navigate]);

  // Fetch data
  useEffect(() => {
    if (!activeSearch.startDate || !activeSearch.endDate) return;

    setIsLoading(true);
    setError(null);

    const queryParams = new URLSearchParams({
      location: activeSearch.pickupLocation,
      startDate: activeSearch.startDate,
      endDate: activeSearch.endDate
    }).toString();

    fetch(`${API_URL}/api/motors?${queryParams}`)
      .then(res => {
        if (!res.ok) throw new Error('Gagal terhubung ke server');
        return res.json();
      })
      .then(data => {
        if (data.success) {
          const availableMotors = data.data.filter(m => m.is_available !== false);
          setMotors(availableMotors);
        } else {
          setError(data.error);
        }
        setIsLoading(false);
      })
      .catch(err => {
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
    // BUG FIX 1: Hitung total hari secara mandiri karena variabel totalDays belum ada
    const start = new Date(activeSearch.startDate);
    const end = new Date(activeSearch.endDate);
    const diffTime = end.getTime() - start.getTime();
    let calculatedDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Fallback jika perhitungan gagal atau kurang dari 1
    if (isNaN(calculatedDays) || calculatedDays < 1) calculatedDays = 1;

    // BUG FIX 2: Fallback activePrice karena SearchResultList hanya mengirim (motor) tanpa harga
    const finalPrice = activePrice || motor.current_price || motor.base_price;

    // BUG FIX 3: Gunakan 'activeSearch' bukan 'searchParams'
    navigate('/checkout-motor', {
      state: {
        motorId: motor.id,
        motorName: motor.name,
        pickupLocation: activeSearch.pickupLocation,
        startDate: activeSearch.startDate,
        endDate: activeSearch.endDate,
        totalDays: calculatedDays, 
        basePrice: finalPrice 
      }
    });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return {
    activeSearch,
    isEditing,
    setIsEditing,
    formData,
    setFormData,
    motors,
    isLoading,
    error,
    handleUpdateSearch,
    handleRent,
    formatDate
  };
};