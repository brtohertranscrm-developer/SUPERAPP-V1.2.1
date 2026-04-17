import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../utils/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token') || localStorage.getItem('admin_token');
  return { Authorization: `Bearer ${token}` };
};

// ==========================================
// REKONSILIASI PEMBAYARAN
// ==========================================
export const useReconciliations = () => {
  const [reconciliations, setReconciliations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReconciliations = useCallback(async (status = 'all') => {
    setIsLoading(true);
    try {
      const query = status !== 'all' ? `?status=${status}` : '';
      const data = await apiFetch(`/api/admin/finance/reconciliations${query}`);
      setReconciliations(data.data);
    } catch (err) {
      console.error('Gagal fetch reconciliations:', err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Upload bukti transfer — pakai fetch langsung karena multipart/form-data
  const addReconciliation = async (formData) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/finance/reconciliations`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData
      });
      const result = await res.json();
      if (result.success) {
        fetchReconciliations();
        return true;
      }
      alert(result.error || 'Gagal mengunggah bukti transfer.');
      return false;
    } catch (err) {
      alert('Terjadi kesalahan jaringan.');
      return false;
    }
  };

  const matchReconciliation = async (id) => {
    try {
      const data = await apiFetch(`/api/admin/finance/reconciliations/${id}/match`, { method: 'PUT' });
      alert(data.message);
      fetchReconciliations();
      return true;
    } catch (err) {
      alert(err.message || 'Gagal mengkonfirmasi rekonsiliasi.');
      return false;
    }
  };

  const rejectReconciliation = async (id, notes = '') => {
    if (!window.confirm('Yakin ingin menolak bukti transfer ini?')) return false;
    try {
      const data = await apiFetch(`/api/admin/finance/reconciliations/${id}/reject`, {
        method: 'PUT',
        body: JSON.stringify({ notes })
      });
      alert(data.message);
      fetchReconciliations();
      return true;
    } catch (err) {
      alert(err.message || 'Gagal menolak rekonsiliasi.');
      return false;
    }
  };

  useEffect(() => { fetchReconciliations(); }, [fetchReconciliations]);

  return {
    reconciliations, isLoading,
    fetchReconciliations, addReconciliation,
    matchReconciliation, rejectReconciliation
  };
};

// ==========================================
// PENGELUARAN OPERASIONAL
// ==========================================
export const useExpenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchExpenses = useCallback(async (filters = {}) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams(
        Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
      ).toString();
      const data = await apiFetch(`/api/admin/finance/expenses${params ? '?' + params : ''}`);
      setExpenses(data.data);
    } catch (err) {
      console.error('Gagal fetch expenses:', err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Pakai fetch langsung karena ada opsional upload struk
  const addExpense = async (formData) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/finance/expenses`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData
      });
      const result = await res.json();
      if (result.success) {
        fetchExpenses();
        return true;
      }
      alert(result.error || 'Gagal menyimpan pengeluaran.');
      return false;
    } catch (err) {
      alert('Terjadi kesalahan jaringan.');
      return false;
    }
  };

  const editExpense = async (id, data) => {
    try {
      await apiFetch(`/api/admin/finance/expenses/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      fetchExpenses();
      return true;
    } catch (err) {
      alert(err.message || 'Gagal memperbarui pengeluaran.');
      return false;
    }
  };

  const deleteExpense = async (id) => {
    if (!window.confirm('Yakin ingin menghapus data pengeluaran ini?')) return false;
    try {
      await apiFetch(`/api/admin/finance/expenses/${id}`, { method: 'DELETE' });
      fetchExpenses();
      return true;
    } catch (err) {
      alert(err.message || 'Gagal menghapus pengeluaran.');
      return false;
    }
  };

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  return { expenses, isLoading, fetchExpenses, addExpense, editExpense, deleteExpense };
};

// ==========================================
// LAPORAN KEUANGAN
// ==========================================
export const useFinanceSummary = () => {
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'));
  const [year, setYear]   = useState(String(now.getFullYear()));
  const [summary, setSummary]     = useState(null);
  const [chartData, setChartData] = useState([]);
  const [breakdown, setBreakdown] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [sumData, chartResult, breakdownResult] = await Promise.all([
        apiFetch(`/api/admin/finance/summary?month=${month}&year=${year}`),
        apiFetch(`/api/admin/finance/revenue-chart?month=${month}&year=${year}`),
        apiFetch(`/api/admin/finance/expense-breakdown?month=${month}&year=${year}`)
      ]);
      setSummary(sumData.data);
      setChartData(chartResult.data);
      setBreakdown(breakdownResult.data);
    } catch (err) {
      console.error('Gagal fetch finance summary:', err.message);
    } finally {
      setIsLoading(false);
    }
  }, [month, year]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return { summary, chartData, breakdown, isLoading, month, setMonth, year, setYear };
};

// ==========================================
// VENDOR PAYOUTS
// ==========================================
export const useVendorPayouts = () => {
  const [payouts, setPayouts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPayouts = useCallback(async (status = 'all') => {
    setIsLoading(true);
    try {
      const query = status !== 'all' ? `?status=${status}` : '';
      const data = await apiFetch(`/api/admin/finance/vendor-payouts${query}`);
      setPayouts(data.data);
    } catch (err) {
      console.error('Gagal fetch vendor payouts:', err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const generatePayouts = async (period_start, period_end) => {
    try {
      const data = await apiFetch('/api/admin/finance/vendor-payouts/generate', {
        method: 'POST',
        body: JSON.stringify({ period_start, period_end })
      });
      alert(data.message);
      fetchPayouts();
      return true;
    } catch (err) {
      alert(err.message || 'Gagal generate payout.');
      return false;
    }
  };

  const approvePayout = async (id) => {
    if (!window.confirm('Approve payout vendor ini?')) return false;
    try {
      const data = await apiFetch(`/api/admin/finance/vendor-payouts/${id}/approve`, { method: 'PUT' });
      alert(data.message);
      fetchPayouts();
      return true;
    } catch (err) {
      alert(err.message || 'Gagal approve payout.');
      return false;
    }
  };

  // Pakai fetch langsung untuk upload bukti transfer
  const markPaid = async (id, formData) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/finance/vendor-payouts/${id}/pay`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: formData
      });
      const result = await res.json();
      if (result.success) {
        fetchPayouts();
        return true;
      }
      alert(result.error || 'Gagal memperbarui payout.');
      return false;
    } catch (err) {
      alert('Terjadi kesalahan jaringan.');
      return false;
    }
  };

  useEffect(() => { fetchPayouts(); }, [fetchPayouts]);

  return { payouts, isLoading, fetchPayouts, generatePayouts, approvePayout, markPaid };
};
