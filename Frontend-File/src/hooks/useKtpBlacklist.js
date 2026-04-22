import { useCallback, useEffect, useState } from 'react';

export const useKtpBlacklist = () => {
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL?.trim() || '';

  const getAuthHeaders = () => {
    const token = localStorage.getItem('admin_token') || localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  };

  const fetchRows = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/ktp-blacklist`, { headers: getAuthHeaders() });
      const json = await res.json();
      if (res.ok && json.success) {
        setRows(Array.isArray(json.data) ? json.data : []);
      } else {
        setRows([]);
      }
    } catch {
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  }, [API_URL]);

  const add = async ({ ktp_id, reason }) => {
    const cleaned = String(ktp_id || '').replace(/\D/g, '');
    if (!cleaned || cleaned.length !== 16) {
      alert('ID KTP harus 16 digit angka.');
      return false;
    }
    try {
      const res = await fetch(`${API_URL}/api/admin/ktp-blacklist`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ ktp_id: cleaned, reason: reason || null }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        await fetchRows();
        return true;
      }
      alert(json.error || 'Gagal menambahkan blacklist.');
      return false;
    } catch {
      alert('Gagal menambahkan blacklist (koneksi/server).');
      return false;
    }
  };

  const remove = async (ktp_id) => {
    const cleaned = String(ktp_id || '').replace(/\D/g, '');
    if (!cleaned || cleaned.length !== 16) return false;
    if (!window.confirm('Hapus KTP ini dari blacklist?')) return false;

    try {
      const res = await fetch(`${API_URL}/api/admin/ktp-blacklist/${cleaned}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        await fetchRows();
        return true;
      }
      alert(json.error || 'Gagal menghapus blacklist.');
      return false;
    } catch {
      alert('Gagal menghapus blacklist (koneksi/server).');
      return false;
    }
  };

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  return { rows, isLoading, refetch: fetchRows, add, remove };
};

