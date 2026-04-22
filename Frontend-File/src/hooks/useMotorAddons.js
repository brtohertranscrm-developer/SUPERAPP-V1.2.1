import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../utils/api';

// ==========================================
// HOOK: useMotorAddons — Admin manage motor add-ons & paket
// ==========================================
export const useMotorAddons = () => {
  const [addons, setAddons] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAddons = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiFetch('/api/admin/motor-addons');
      setAddons(Array.isArray(data?.data) ? data.data : []);
    } catch (err) {
      console.error('Gagal fetch motor addons:', err.message);
      setAddons([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addAddon = async (payload) => {
    try {
      await apiFetch('/api/admin/motor-addons', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      fetchAddons();
      return true;
    } catch (err) {
      alert(err.message || 'Gagal menambahkan add-on.');
      return false;
    }
  };

  const editAddon = async (id, payload) => {
    try {
      await apiFetch(`/api/admin/motor-addons/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      fetchAddons();
      return true;
    } catch (err) {
      alert(err.message || 'Gagal memperbarui add-on.');
      return false;
    }
  };

  const deleteAddon = async (id) => {
    if (!window.confirm('Yakin ingin menghapus add-on ini?')) return false;
    try {
      await apiFetch(`/api/admin/motor-addons/${id}`, { method: 'DELETE' });
      fetchAddons();
      return true;
    } catch (err) {
      alert(err.message || 'Gagal menghapus add-on.');
      return false;
    }
  };

  useEffect(() => { fetchAddons(); }, [fetchAddons]);

  return { addons, isLoading, fetchAddons, addAddon, editAddon, deleteAddon };
};

