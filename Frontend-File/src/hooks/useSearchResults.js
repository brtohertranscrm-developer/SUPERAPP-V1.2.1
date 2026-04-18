import { useContext, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CityContext } from '../context/CityContext';

export const useSearchResults = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const cityContext = useContext(CityContext);

  const passedData = location.state || {};

  // FIX: sanitize ke 'Yogyakarta' atau 'Solo' saja
  const sanitizeCity = (cityValue) => {
    if (!cityValue) return 'Yogyakarta';
    const v = cityValue.toLowerCase();
    if (v.includes('solo') || v.includes('balapan')) return 'Solo';
    // semua varian Jogja/Yogya/Lempuyangan → Yogyakarta
    return 'Yogyakarta';
  };

  const [currentCity, setCurrentCity] = useState(() =>
    sanitizeCity(passedData.selectedCity || cityContext?.selectedCity)
  );

  const today = new Date().toISOString().split('T')[0];
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = tomorrowDate.toISOString().split('T')[0];

  const [startDate,   setStartDate]   = useState(passedData.startDate || today);
  const [endDate,     setEndDate]     = useState(passedData.endDate   || tomorrow);
  const [totalDays,   setTotalDays]   = useState(1);

  const [showSearchEdit,    setShowSearchEdit]    = useState(false);
  const [filterType,        setFilterType]        = useState('Semua');
  const [selectedPackages,  setSelectedPackages]  = useState({});

  const [motors,    setMotors]    = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

  // Sync city ke global context
  useEffect(() => {
    if (location.state?.selectedCity) {
      setCurrentCity(sanitizeCity(location.state.selectedCity));
    }
  }, [location.state]);

  useEffect(() => {
    if (cityContext?.setSelectedCity && currentCity !== cityContext.selectedCity) {
      cityContext.setSelectedCity(currentCity);
    }
  }, [currentCity, cityContext]);

  // Hitung total hari
  useEffect(() => {
    try {
      const start = new Date(startDate || today);
      const end   = new Date(endDate   || tomorrow);
      const diff  = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      setTotalDays(!isNaN(diff) && diff > 0 ? diff : 1);
    } catch {
      setTotalDays(1);
    }
  }, [startDate, endDate]);

  // Fetch motor
  useEffect(() => {
    setIsLoading(true);
    fetch(`${API_URL}/api/motors`)
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.data)) {
          setMotors(data.data);
        } else {
          setMotors([]);
          setError(data.error || 'Format data salah dari server.');
        }
        setIsLoading(false);
      })
      .catch(() => {
        setMotors([]);
        setError('Gagal mengambil data. Pastikan server Backend menyala.');
        setIsLoading(false);
      });
  }, [API_URL]);

  // Filter lokal berdasarkan kota dan tipe
  const filteredResults = motors.filter(motor => {
    if (!motor) return false;
    // FIX: motor.location di DB masih bisa 'Lempuyangan' atau 'Balapan'
    // → normalize dulu sebelum dibandingkan
    const motorCity = sanitizeCity(motor.location || '');
    const matchCity = motorCity === currentCity;
    const matchType = filterType === 'Semua' ||
      (motor.category || '').toLowerCase().includes(filterType.toLowerCase());
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
        motorName:      motor.name,
        basePrice:      activePrice,
        pickupLocation: currentCity,
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
    navigateToCheckout,
  };
};
