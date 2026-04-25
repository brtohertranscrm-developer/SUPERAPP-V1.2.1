import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../utils/api';

export const useAdminMilesRewards = () => {
  const [rewards, setRewards] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRewards = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiFetch('/api/admin/miles-rewards');
      setRewards(Array.isArray(data?.data) ? data.data : []);
    } catch (e) {
      alert(e?.message || 'Gagal mengambil Miles rewards.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveReward = useCallback(async (payload, editingId = null) => {
    try {
      const endpoint = editingId ? `/api/admin/miles-rewards/${editingId}` : '/api/admin/miles-rewards';
      await apiFetch(endpoint, {
        method: editingId ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      });
      await fetchRewards();
      return true;
    } catch (e) {
      alert(e?.message || 'Gagal menyimpan reward.');
      return false;
    }
  }, [fetchRewards]);

  const toggleReward = useCallback(async (id, nextActive) => {
    if (!window.confirm(`Yakin ingin ${nextActive ? 'mengaktifkan' : 'menonaktifkan'} reward ini?`)) return;
    try {
      await apiFetch(`/api/admin/miles-rewards/${id}/toggle`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: nextActive ? 1 : 0 }),
      });
      await fetchRewards();
    } catch (e) {
      alert(e?.message || 'Gagal mengubah status reward.');
    }
  }, [fetchRewards]);

  const deleteReward = useCallback(async (id) => {
    if (!window.confirm('Hapus reward ini? Jika sudah pernah ditukar, sistem akan menolak dan kamu harus menonaktifkannya.')) return;
    try {
      await apiFetch(`/api/admin/miles-rewards/${id}`, { method: 'DELETE' });
      await fetchRewards();
    } catch (e) {
      alert(e?.message || 'Gagal menghapus reward.');
    }
  }, [fetchRewards]);

  useEffect(() => {
    fetchRewards();
  }, [fetchRewards]);

  return {
    rewards,
    isLoading,
    fetchRewards,
    saveReward,
    toggleReward,
    deleteReward,
  };
};

