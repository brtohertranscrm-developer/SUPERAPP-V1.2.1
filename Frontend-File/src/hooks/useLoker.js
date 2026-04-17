import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../utils/api';

// ==========================================
// HOOK: useLoker — Admin manage loker
// ==========================================
export const useLoker = () => {
  const [lokers, setLokers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLokers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiFetch('/api/admin/loker');
      setLokers(data.data);
    } catch (err) {
      console.error('Gagal fetch lokers:', err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addLoker = async (payload) => {
    try {
      await apiFetch('/api/admin/loker', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      fetchLokers();
      return true;
    } catch (err) {
      alert(err.message || 'Gagal menambahkan loker.');
      return false;
    }
  };

  const editLoker = async (id, payload) => {
    try {
      await apiFetch(`/api/admin/loker/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      fetchLokers();
      return true;
    } catch (err) {
      alert(err.message || 'Gagal memperbarui loker.');
      return false;
    }
  };

  const deleteLoker = async (id) => {
    if (!window.confirm('Yakin ingin menghapus loker ini?')) return false;
    try {
      await apiFetch(`/api/admin/loker/${id}`, { method: 'DELETE' });
      fetchLokers();
      return true;
    } catch (err) {
      alert(err.message || 'Gagal menghapus loker.');
      return false;
    }
  };

  useEffect(() => { fetchLokers(); }, [fetchLokers]);

  return { lokers, isLoading, fetchLokers, addLoker, editLoker, deleteLoker };
};

// ==========================================
// HOOK: useLokerAddons — Admin manage addon pickup/drop
// ==========================================
export const useLokerAddons = () => {
  const [addons, setAddons] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAddons = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiFetch('/api/admin/loker/addons');
      setAddons(data.data);
    } catch (err) {
      console.error('Gagal fetch loker addons:', err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addAddon = async (payload) => {
    try {
      await apiFetch('/api/admin/loker/addons', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      fetchAddons();
      return true;
    } catch (err) {
      alert(err.message || 'Gagal menambahkan addon.');
      return false;
    }
  };

  const editAddon = async (id, payload) => {
    try {
      await apiFetch(`/api/admin/loker/addons/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      fetchAddons();
      return true;
    } catch (err) {
      alert(err.message || 'Gagal memperbarui addon.');
      return false;
    }
  };

  const deleteAddon = async (id) => {
    if (!window.confirm('Yakin ingin menghapus addon ini?')) return false;
    try {
      await apiFetch(`/api/admin/loker/addons/${id}`, { method: 'DELETE' });
      fetchAddons();
      return true;
    } catch (err) {
      alert(err.message || 'Gagal menghapus addon.');
      return false;
    }
  };

  useEffect(() => { fetchAddons(); }, [fetchAddons]);

  return { addons, isLoading, fetchAddons, addAddon, editAddon, deleteAddon };
};
