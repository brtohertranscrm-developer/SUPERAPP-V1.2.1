import { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';

export const useArtikel = () => {
  const [artikel, setArtikel] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchArtikel = async () => {
    setLoading(true);
    try {
      const result = await apiFetch('/api/admin/articles');
      if (result.success) setArtikel(result.data || []);
    } catch (error) {
      console.error("Gagal mengambil data artikel:", error);
    } finally {
      setLoading(false);
    }
  };

  const addArtikel = async (data) => {
    try {
      await apiFetch('/api/admin/articles', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      fetchArtikel();
    } catch (error) { console.error(error); }
  };

  const editArtikel = async (id, data) => {
    try {
      await apiFetch(`/api/admin/articles/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      fetchArtikel(); 
    } catch (error) { console.error(error); }
  };

  const deleteArtikel = async (id) => {
    if(!window.confirm("Yakin ingin menghapus artikel ini?")) return;
    try {
      await apiFetch(`/api/admin/articles/${id}`, { method: 'DELETE' });
      fetchArtikel();
    } catch (error) { console.error(error); }
  };

  useEffect(() => {
    fetchArtikel();
  }, []);

  return { artikel, loading, addArtikel, editArtikel, deleteArtikel };
};
