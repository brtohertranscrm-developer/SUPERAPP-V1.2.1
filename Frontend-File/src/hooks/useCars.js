import { useCallback, useEffect, useState } from 'react';

export const useCars = () => {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL?.trim() || '';

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token') || localStorage.getItem('admin_token');
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  };

  const fetchCars = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/cars`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data?.success) setCars(Array.isArray(data.data) ? data.data : []);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Gagal ambil cars:', e);
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  const addCar = async (payload) => {
    await fetch(`${API_URL}/api/admin/cars`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    fetchCars();
  };

  const editCar = async (id, payload) => {
    await fetch(`${API_URL}/api/admin/cars/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    fetchCars();
  };

  const deleteCar = async (id) => {
    if (!window.confirm('Hapus katalog mobil ini beserta semua unitnya?')) return;
    await fetch(`${API_URL}/api/admin/cars/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    fetchCars();
  };

  const fetchUnits = async (carId) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/cars/${carId}/units`, { headers: getAuthHeaders() });
      const data = await res.json();
      return data?.success ? (Array.isArray(data.data) ? data.data : []) : [];
    } catch {
      return [];
    }
  };

  const addUnit = async (carId, payload) => {
    await fetch(`${API_URL}/api/admin/cars/${carId}/units`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    fetchCars();
  };

  const updateUnit = async (unitId, payload) => {
    await fetch(`${API_URL}/api/admin/car-units/${unitId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    fetchCars();
  };

  const deleteUnit = async (unitId) => {
    if (!window.confirm('Hapus unit mobil ini permanen?')) return false;
    await fetch(`${API_URL}/api/admin/car-units/${unitId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    fetchCars();
    return true;
  };

  useEffect(() => { fetchCars(); }, [fetchCars]);

  return {
    cars,
    loading,
    fetchCars,
    addCar,
    editCar,
    deleteCar,
    fetchUnits,
    addUnit,
    updateUnit,
    deleteUnit,
  };
};

