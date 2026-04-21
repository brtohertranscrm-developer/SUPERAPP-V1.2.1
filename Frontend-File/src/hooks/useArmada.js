import { useState, useEffect, useCallback } from 'react';

export const useArmada = () => {
  const [armada, setArmada] = useState([]);
  const [loading, setLoading] = useState(false);

  // 1. URL Dinamis agar aman saat di-hosting
  const API_URL = import.meta.env.VITE_API_URL?.trim() || '';

  // 2. Fungsi untuk menarik token segar tepat sebelum menembak API
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token') || localStorage.getItem('admin_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}` 
    };
  };

  const fetchArmada = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/admin/motors`, { 
        headers: getAuthHeaders() // Gunakan header dinamis
      });
      const result = await response.json();
      if (result.success) setArmada(result.data);
    } catch (error) { 
      console.error("Gagal ambil armada:", error); 
    } finally { 
      setLoading(false); 
    }
  }, [API_URL]);

  const addArmada = async (data) => {
    try {
      await fetch(`${API_URL}/api/admin/motors`, { 
        method: 'POST', 
        headers: getAuthHeaders(), // Gunakan header dinamis
        body: JSON.stringify(data) 
      });
      fetchArmada();
    } catch (error) { console.error(error); }
  };

  const editArmada = async (id, data) => {
    try {
      await fetch(`${API_URL}/api/admin/motors/${id}`, { 
        method: 'PUT', 
        headers: getAuthHeaders(), // Gunakan header dinamis
        body: JSON.stringify(data) 
      });
      fetchArmada(); 
    } catch (error) { console.error(error); }
  };

  const deleteArmada = async (id) => {
    if(!window.confirm("Yakin ingin menghapus katalog motor ini beserta SEMUA plat nomornya?")) return;
    try {
      await fetch(`${API_URL}/api/admin/motors/${id}`, { 
        method: 'DELETE', 
        headers: getAuthHeaders() // Gunakan header dinamis
      });
      fetchArmada();
    } catch (error) { console.error(error); }
  };

  // --- FUNGSI UNTUK MANAJEMEN PLAT NOMOR (UNIT) ---
  const fetchUnits = async (motorId) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/motors/${motorId}/units`, { 
        headers: getAuthHeaders() // Gunakan header dinamis
      });
      const result = await response.json();
      return result.success ? result.data : [];
    } catch (error) { console.error(error); return []; }
  };

  const addUnit = async (motorId, data) => {
    try {
      await fetch(`${API_URL}/api/admin/motors/${motorId}/units`, { 
        method: 'POST', 
        headers: getAuthHeaders(), // Gunakan header dinamis
        body: JSON.stringify(data) 
      });
      fetchArmada(); // Refresh agar stok bertambah
    } catch (error) { console.error(error); }
  };

  const updateUnit = async (unitId, data) => {
    try {
      await fetch(`${API_URL}/api/admin/units/${unitId}`, { 
        method: 'PUT', 
        headers: getAuthHeaders(), // Gunakan header dinamis
        body: JSON.stringify(data) 
      });
      fetchArmada(); // Refresh stok jika status diubah
    } catch (error) { console.error(error); }
  };

  const deleteUnit = async (unitId) => {
    if(!window.confirm("Hapus plat nomor ini permanen?")) return false;
    try {
      await fetch(`${API_URL}/api/admin/units/${unitId}`, { 
        method: 'DELETE', 
        headers: getAuthHeaders() // Gunakan header dinamis
      });
      fetchArmada(); // Refresh stok
      return true;
    } catch (error) { console.error(error); return false; }
  };

  useEffect(() => { 
    fetchArmada(); 
  }, [fetchArmada]);

  return { armada, loading, addArmada, editArmada, deleteArmada, fetchUnits, addUnit, updateUnit, deleteUnit };
};