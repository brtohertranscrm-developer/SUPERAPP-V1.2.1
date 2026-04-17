import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../utils/api'; // Sesuaikan path

export const usePromotions = () => {
  const [promos, setPromos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fungsi Fetch
  const fetchPromos = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiFetch('/api/admin/promos'); // Asumsi endpoint disamakan di backend
      setPromos(data.data);
    } catch (error) {
      alert(error.message || 'Gagal mengambil data promo.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fungsi Save (Create & Update)
  const savePromo = async (promoData, editingId = null) => {
    try {
      const endpoint = editingId ? `/api/admin/promos/${editingId}` : '/api/admin/promos';
      await apiFetch(endpoint, {
        method: editingId ? 'PUT' : 'POST',
        body: JSON.stringify(promoData)
      });
      
      alert(editingId ? 'Promo berhasil diperbarui!' : 'Promo berhasil ditambahkan!');
      fetchPromos();
      return true;
    } catch (error) {
      alert(`Gagal menyimpan promo: ${error.message}`);
      return false;
    }
  };

  // Fungsi Delete
  const deletePromo = async (id) => {
    if (!window.confirm('Hapus promo ini secara permanen?')) return;
    try {
      await apiFetch(`/api/admin/promos/${id}`, { method: 'DELETE' });
      alert('Promo berhasil dihapus!');
      fetchPromos();
      return true;
    } catch (error) {
      alert(`Gagal menghapus promo: ${error.message}`);
      return false;
    }
  };

  // Fungsi Toggle Status Aktif/Mati
  const togglePromoStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 1 ? 0 : 1;
    if (!window.confirm(`Yakin ingin ${newStatus === 1 ? 'mengaktifkan' : 'mematikan'} promo ini?`)) return;
    try {
      await apiFetch(`/api/admin/promos/${id}/toggle`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: newStatus })
      });
      fetchPromos(); 
    } catch (error) {
      alert(`Gagal mengubah status promo: ${error.message}`);
    }
  };

  useEffect(() => {
    fetchPromos();
  }, [fetchPromos]);

  return { promos, isLoading, fetchPromos, savePromo, deletePromo, togglePromoStatus };
};