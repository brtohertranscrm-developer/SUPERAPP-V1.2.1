import { useEffect, useRef, useState } from 'react';
import { DEFAULT_PICKUP_TIME, DEFAULT_RETURN_TIME } from '../utils/motorRentalPricing';

const todayYmd = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const shiftYmd = (ymd, deltaDays) => {
  const d = new Date(`${ymd}T00:00`);
  d.setDate(d.getDate() + deltaDays);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const normalizeCityKey = (city) => {
  const v = String(city || '').trim().toLowerCase();
  if (!v) return 'unknown';
  if (v.includes('solo') || v.includes('balapan')) return 'solo';
  if (v.includes('yogya') || v.includes('yogyakarta') || v.includes('jogja')) return 'yogyakarta';
  return v.replace(/\s+/g, '_');
};

export const useCarCatalog = () => {
  const searchRef = useRef(null);
  const API_URL = import.meta.env.VITE_API_URL?.trim() || '';

  // Availability-first: kita kasih default 1 hari supaya user langsung lihat contoh hasil.
  const [form, setForm] = useState({
    pickupCity: 'Yogyakarta',
    startDate: todayYmd(),
    startTime: DEFAULT_PICKUP_TIME,
    endDate: shiftYmd(todayYmd(), 1),
    endTime: DEFAULT_RETURN_TIME,
  });

  const [activeSearch, setActiveSearch] = useState({ ...form });
  const [cars, setCars] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const canSearch = !!activeSearch.startDate && !!activeSearch.endDate;

  const fetchCars = async (search) => {
    setIsLoading(true);
    setError('');
    try {
      const startDateTime = `${search.startDate}T${search.startTime || DEFAULT_PICKUP_TIME}:00`;
      const endDateTime = `${search.endDate}T${search.endTime || DEFAULT_RETURN_TIME}:00`;
      const qs = new URLSearchParams({
        start_date: startDateTime,
        end_date: endDateTime,
      }).toString();

      const res = await fetch(`${API_URL}/api/cars?${qs}`);
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Gagal mengambil data mobil.');
      }

      const list = Array.isArray(data.data) ? data.data : [];
      const pickupKey = normalizeCityKey(search.pickupCity);

      // Sort: mobil yang unitnya ready di kota pickup naik ke atas, lalu stock total.
      list.sort((a, b) => {
        const aLocal = Number(a?.availability_by_location?.[pickupKey]) || 0;
        const bLocal = Number(b?.availability_by_location?.[pickupKey]) || 0;
        if (bLocal !== aLocal) return bLocal - aLocal;
        const aStock = Number(a?.stock) || 0;
        const bStock = Number(b?.stock) || 0;
        if (bStock !== aStock) return bStock - aStock;
        return (Number(a?.base_price) || 0) - (Number(b?.base_price) || 0);
      });

      // Filter: stock > 0 saja (availability-first).
      setCars(list.filter((c) => (Number(c?.stock) || 0) > 0));
    } catch (e) {
      setCars([]);
      setError(e?.message || 'Gagal memuat mobil.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (!form.startDate || !form.endDate) {
      alert('Tentukan tanggal booking dulu ya.');
      return;
    }
    setActiveSearch({ ...form });
    await fetchCars({ ...form });
    searchRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Auto-load once (default dates) supaya user langsung lihat hasil.
  useEffect(() => {
    // eslint-disable-next-line no-void
    void fetchCars(activeSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    searchRef,
    form,
    setForm,
    activeSearch,
    cars,
    isLoading,
    error,
    canSearch,
    handleSubmit,
  };
};
