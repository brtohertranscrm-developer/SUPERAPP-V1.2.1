import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../utils/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
const MIN_HOURS = 3;

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// ==========================================
// HELPER: Kalkulasi harga lokal (mirror backend)
// ==========================================
export const calcLockerPrice = (hours, price_1h, price_12h, price_24h) => {
  const h = parseInt(hours);
  if (!h || h < MIN_HOURS) return { total: 0, isValid: false };

  let remaining = h;
  let total = 0;
  const packs24 = Math.floor(remaining / 24); remaining -= packs24 * 24; total += packs24 * price_24h;
  const packs12 = Math.floor(remaining / 12); remaining -= packs12 * 12; total += packs12 * price_12h;
  total += remaining * price_1h;

  return { total, isValid: true, packs24, packs12, remainingHours: remaining };
};

// ==========================================
// HOOK: useLockerCatalog — katalog + pilih loker
// ==========================================
export const useLockerCatalog = (location = null) => {
  const [lockers, setLockers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLockers = useCallback(async () => {
    setIsLoading(true);
    try {
      const query = location ? `?location=${encodeURIComponent(location)}` : '';
      const data = await apiFetch(`/api/loker/catalog${query}`);
      setLockers(data.data);
    } catch (err) {
      console.error('Gagal fetch loker catalog:', err.message);
    } finally {
      setIsLoading(false);
    }
  }, [location]);

  useEffect(() => { fetchLockers(); }, [fetchLockers]);

  return { lockers, isLoading, fetchLockers };
};

// ==========================================
// HOOK: useLockerAddons — addon pickup & drop (public)
// ==========================================
export const useLockerAddons = () => {
  const [addons, setAddons] = useState({ pickup: [], drop: [] });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/loker/addons')
      .then(data => {
        const grouped = { pickup: [], drop: [] };
        data.data.forEach(a => { if (grouped[a.addon_type]) grouped[a.addon_type].push(a); });
        setAddons(grouped);
      })
      .catch(err => console.error('Gagal fetch addons:', err.message))
      .finally(() => setIsLoading(false));
  }, []);

  return { addons, isLoading };
};

// ==========================================
// HOOK: useLockerCheckout — form + submit booking
// ==========================================
export const useLockerCheckout = (locker) => {
  const [form, setForm] = useState({
    duration_hours: MIN_HOURS,
    start_date: new Date().toISOString().split('T')[0],
    start_time: '09:00',
    pickup_addon_id: null,
    drop_addon_id: null,
    payment_method: 'transfer'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Hitung harga real-time dari form
  const pricing = locker
    ? calcLockerPrice(form.duration_hours, locker.price_1h, locker.price_12h, locker.price_24h)
    : { total: 0, isValid: false };

  const updateForm = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const setDuration = (val) => {
    const h = Math.max(MIN_HOURS, parseInt(val) || MIN_HOURS);
    updateForm('duration_hours', h);
  };

  const submit = async (pickupFee = 0, dropFee = 0) => {
    if (!locker) return { success: false, error: 'Loker belum dipilih.' };
    if (form.duration_hours < MIN_HOURS) {
      return { success: false, error: `Minimal ${MIN_HOURS} jam.` };
    }

    setIsSubmitting(true);
    try {
      const startDatetime = `${form.start_date}T${form.start_time}:00`;

      const res = await fetch(`${API_URL}/api/loker/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          locker_id: locker.id,
          duration_hours: form.duration_hours,
          start_date: startDatetime,
          pickup_addon_id: form.pickup_addon_id,
          drop_addon_id: form.drop_addon_id,
          payment_method: form.payment_method
        })
      });
      const result = await res.json();
      return result;
    } catch (err) {
      return { success: false, error: 'Terjadi kesalahan jaringan.' };
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    form, updateForm, setDuration,
    pricing, isSubmitting,
    submit,
    MIN_HOURS
  };
};
