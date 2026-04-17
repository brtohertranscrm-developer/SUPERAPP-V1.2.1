import { useContext, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CityContext } from '../context/CityContext';

export const useSearchResults = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const cityContext = useContext(CityContext);

  const passedData = location.state || {};
  
  // Sanitizer: Memastikan nama kota sesuai DB
  const sanitizeCity = (cityValue) => {
    if (!cityValue) return 'Stasiun Lempuyangan';
    if (cityValue === 'Yogyakarta' || cityValue.toLowerCase().includes('jogja')) return 'Stasiun Lempuyangan';
    if (cityValue === 'Solo') return 'Stasiun Solo Balapan';
    return cityValue;
  };

  const [currentCity, setCurrentCity] = useState(() => {
    const initial = passedData.selectedCity || cityContext?.selectedCity || 'Stasiun Lempuyangan';
    return sanitizeCity(initial);
  });
  
  const today = new Date().toISOString().split('T')[0];
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = tomorrowDate.toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(passedData.startDate || today);
  const [endDate, setEndDate] = useState(passedData.endDate || tomorrow);
  const [totalDays, setTotalDays] = useState(1);

  const [showSearchEdit, setShowSearchEdit] = useState(false);
  const [filterType, setFilterType] = useState('Semua');
  const [selectedPackages, setSelectedPackages] = useState({});

  const [motors, setMotors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

  // Sinkronisasi data saat user balik dari halaman lain
  useEffect(() => {
    if (location.state?.selectedCity) {
      setCurrentCity(sanitizeCity(location.state.selectedCity));
    }
  }, [location.state]);

  // Sinkronisasi ke Global Context
  useEffect(() => {
    if (cityContext?.setSelectedCity && currentCity !== cityContext.selectedCity) {
      cityContext.setSelectedCity(currentCity);
    }
  }, [currentCity, cityContext]);

// Hitung Total Hari
  useEffect(() => {
    try {
      const start = new Date(startDate || today);
      const end = new Date(endDate || tomorrow);
      const diffTime = end.getTime() - start.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // FIX: Cek apakah hasilnya NaN untuk mencegah bug harga di checkout
      setTotalDays(!isNaN(diffDays) && diffDays > 0 ? diffDays : 1);
    } catch (e) {
      setTotalDays(1);
    }
  }, [startDate, endDate, today, tomorrow]);

  // Ambil Data Motor
  useEffect(() => {
    setIsLoading(true);
    fetch(`${API_URL}/api/motors`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setMotors(data.data); 
        } else {
          setMotors([]);
          setError(data.error || 'Format data salah dari server.');
        }
        setIsLoading(false); 
      })
      .catch((err) => {
        setMotors([]);
        setError('Gagal mengambil data. Pastikan server Backend Node.js menyala.');
        setIsLoading(false);
      });
  }, [API_URL]);

  // Filtering Lokal
  const filteredResults = motors.filter(motor => {
    if (!motor) return false;
    // Perbaikan: Gunakan field location asli dari database
    const motorCity = motor.location || 'Stasiun Lempuyangan'; // Fallback jika DB kosong
    const matchCity = currentCity ? motorCity === currentCity : true; 
    
    const categoryStr = motor.category || '';
    const matchType = filterType === 'Semua' ? true : categoryStr.toLowerCase().includes(filterType.toLowerCase());
    
    return matchCity && matchType;
  });

  const handlePackageChange = (motorId, duration) => {
    setSelectedPackages(prev => ({ ...prev, [motorId]: duration }));
  };

  const navigateToCheckout = (motor, activePrice) => {
    navigate('/checkout-motor', { 
      state: { 
        startDate, 
        endDate, 
        totalDays, 
        motorName: motor.name, 
        basePrice: activePrice, 
        pickupLocation: currentCity 
      } 
    });
  };

  return {
    currentCity, setCurrentCity,
    startDate, setStartDate, today,
    endDate, setEndDate,
    totalDays,
    showSearchEdit, setShowSearchEdit,
    filterType, setFilterType,
    selectedPackages, handlePackageChange,
    isLoading, error, filteredResults,
    navigateToCheckout
  };
};