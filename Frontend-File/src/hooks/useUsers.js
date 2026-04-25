import { useState, useEffect, useCallback } from 'react';

export const useUsers = () => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL?.trim() || '';

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token') || localStorage.getItem('admin_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      // NOTE: Cache-Control DIHAPUS — header ini tidak ada di Access-Control-Allow-Headers
      // backend sehingga preflight OPTIONS request ditolak dengan CORS error.
      // Cache busting sudah cukup via query string ?_t=timestamp
    };
  };

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      // FIX: endpoint yang benar adalah /api/admin/kyc
      // tapi kita tambah cache buster dan error handling yang lebih baik
      const res = await fetch(`${API_URL}/api/admin/kyc?_t=${Date.now()}`, {
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        console.error(`HTTP ${res.status}: Gagal mengambil data pelanggan`);
        setUsers([]);
        return;
      }

      const data = await res.json();

      if (data.success && Array.isArray(data.data)) {
        setUsers(data.data);
      } else {
        console.error('Format response tidak valid:', data);
        setUsers([]);
      }
    } catch (error) {
      console.error('Gagal mengambil data pelanggan:', error);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, [API_URL]);

  // FIX: status yang dikirim harus sesuai validStatuses di backend:
  // 'unverified' | 'pending' | 'verified' | 'rejected'
  const updateKyc = async (id, name, newStatus) => {
    const validStatuses = ['unverified', 'pending', 'verified', 'rejected'];
    if (!validStatuses.includes(newStatus)) {
      console.error('Status KYC tidak valid:', newStatus);
      return;
    }

    const actionText = {
      verified:   'VERIFIKASI MANUAL',
      rejected:   'TOLAK / BEKUKAN',
      unverified: 'CABUT VERIFIKASI',
      pending:    'SET KE PENDING',
    }[newStatus] || newStatus;

    if (!window.confirm(`Yakin ingin ${actionText} akun ${name}?`)) return;

    try {
      const res = await fetch(`${API_URL}/api/admin/kyc/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        alert('Gagal mengupdate status KYC: ' + (errData.error || res.status));
        return;
      }

      const data = await res.json();
      if (data.success) {
        fetchUsers();
      } else {
        alert('Gagal mengupdate status KYC: ' + (data.error || ''));
      }
    } catch (error) {
      console.error('Update KYC error:', error);
      alert('Koneksi ke server gagal.');
    }
  };

  const generateCode = async (id, name) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/kyc/${id}/code`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        alert('Gagal membuat kode KYC.');
        return;
      }

      const data = await res.json();
      if (data.success) {
        navigator.clipboard.writeText(data.code).catch(() => {});
        alert(`Kode KYC untuk ${name}:\n\n${data.code}\n\n✅ Disalin ke clipboard.`);
        fetchUsers();
      } else {
        alert('Gagal membuat kode unik: ' + (data.error || ''));
      }
    } catch (err) {
      console.error('Generate code error:', err);
      alert('Gagal terhubung ke server.');
    }
  };

  const deleteUser = async (id, name) => {
    const displayName = name || 'user ini';
    const confirmText =
      `Yakin ingin HAPUS DATA pelanggan ${displayName}?\n\n` +
      `Aksi ini akan menganonimkan data (nama/email/phone/KTP/akun login) dan tidak bisa dibatalkan.`;

    if (!window.confirm(confirmText)) return;

    try {
      const res = await fetch(`${API_URL}/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        alert('Gagal menghapus data pelanggan: ' + (data.error || res.status));
        return;
      }

      alert(data.message || 'Data pelanggan berhasil dihapus.');
      fetchUsers();
    } catch (err) {
      console.error('Delete user error:', err);
      alert('Koneksi ke server gagal.');
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return { users, isLoading, updateKyc, generateCode, deleteUser, refetch: fetchUsers };
};
