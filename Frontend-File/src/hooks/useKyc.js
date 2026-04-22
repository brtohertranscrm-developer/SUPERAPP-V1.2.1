import { useState, useEffect, useCallback } from 'react';

export const useKyc = () => {
  const [kycData, setKycData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Gunakan URL dinamis agar aman saat hosting
  const API_URL = import.meta.env.VITE_API_URL?.trim() || '';

  // 2. Fungsi penarik token yang selalu fresh (segar) saat API dipanggil
  const getAuthHeaders = () => {
    const token = localStorage.getItem('admin_token') || localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  const fetchKycData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/kyc`, {
        headers: getAuthHeaders() // Gunakan header dinamis
      });
      const data = await res.json();
      if (data.success) setKycData(data.data);
    } catch (error) {
      console.error('Gagal mengambil data KYC:', error);
    } finally {
      setIsLoading(false);
    }
  }, [API_URL]); // Hapus ketergantungan pada token statis

  const updateKycStatus = async (id, newStatus, userName) => {
    const actionNameMap = {
      verified: 'MEMVERIFIKASI',
      unverified: 'MENCABUT',
      rejected: 'MENOLAK',
      pending: 'MENGUBAH KE PENDING',
    };
    const actionName = actionNameMap[newStatus] || 'MEMPERBARUI';
    if (!window.confirm(`Anda yakin ingin ${actionName} verifikasi akun ${userName}?`)) return;

    try {
      const res = await fetch(`${API_URL}/api/admin/kyc/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(), // Gunakan header dinamis
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      
      if (data.success) {
        fetchKycData(); 
      } else {
        alert('Gagal memproses verifikasi.');
      }
    } catch (error) {
      alert('Koneksi ke server gagal.');
    }
  };

  const generateCode = async (id, userName) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/kyc/${id}/code`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const data = await res.json();

      if (!res.ok || !data?.success) {
        alert(data?.error || 'Gagal membuat kode KYC.');
        return false;
      }

      navigator.clipboard.writeText(data.code).catch(() => {});
      alert(`Kode KYC untuk ${userName}:\n\n${data.code}\n\n✅ Disalin ke clipboard.`);
      fetchKycData();
      return true;
    } catch (error) {
      console.error('Generate KYC code error:', error);
      alert('Koneksi ke server gagal.');
      return false;
    }
  };

  useEffect(() => {
    fetchKycData();
  }, [fetchKycData]);

  return { kycData, isLoading, updateKycStatus, generateCode };
};
