import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../utils/api';

export const usePartnersAdmin = () => {
  const [partners, setPartners] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPartners = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiFetch('/api/admin/partners');
      setPartners(Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      alert(err.message || 'Gagal mengambil data partner.');
      setPartners([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const savePartner = async (payload, editingId = null) => {
    try {
      const endpoint = editingId ? `/api/admin/partners/${editingId}` : '/api/admin/partners';
      await apiFetch(endpoint, {
        method: editingId ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      });
      await fetchPartners();
      return true;
    } catch (err) {
      alert(err.message || 'Gagal menyimpan partner.');
      return false;
    }
  };

  const deletePartner = async (id) => {
    if (!window.confirm('Hapus partner ini?')) return false;
    try {
      await apiFetch(`/api/admin/partners/${id}`, { method: 'DELETE' });
      await fetchPartners();
      return true;
    } catch (err) {
      alert(err.message || 'Gagal menghapus partner.');
      return false;
    }
  };

  const setPartnerActive = async (id, isActive) => {
    try {
      await apiFetch(`/api/admin/partners/${id}/active`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: isActive ? 1 : 0 }),
      });
      await fetchPartners();
      return true;
    } catch (err) {
      alert(err.message || 'Gagal mengubah status partner.');
      return false;
    }
  };

  useEffect(() => {
    fetchPartners();
  }, [fetchPartners]);

  return { partners, isLoading, fetchPartners, savePartner, deletePartner, setPartnerActive };
};

