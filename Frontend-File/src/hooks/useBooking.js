import { useState, useEffect, useCallback } from 'react';

export const useBooking = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL?.trim() || '';

  const getAuthHeaders = () => {
    const token = localStorage.getItem('admin_token') || localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  // ==========================================
  // FETCH SEMUA BOOKING
  // ==========================================
  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/admin/bookings`, {
        headers: getAuthHeaders()
      });
      const result = await response.json();
      if (result.success) setBookings(result.data);
    } catch (error) {
      console.error('Gagal mengambil data booking:', error);
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  // ==========================================
  // UPDATE STATUS BOOKING (booking + payment)
  // ==========================================
  const updateBookingStatus = async (orderId, data) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/bookings/${orderId}/status`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
      });
      const result = await res.json();
      if (result.success) {
        fetchBookings();
        return true;
      }
      alert(result.error || 'Gagal update status.');
      return false;
    } catch (error) {
      console.error('Gagal update status booking:', error);
      return false;
    }
  };

  // ==========================================
  // FETCH DETAIL 1 BOOKING (termasuk breakdown harga)
  // Dipakai oleh BookingModal dan AdminInvoice
  // ==========================================
  const fetchBookingByOrderId = useCallback(async (orderId) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/bookings/${orderId}`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      if (!response.ok) {
        throw new Error(`Endpoint tidak ditemukan (Status: ${response.status})`);
      }
      const result = await response.json();
      if (result.success) return result.data;
      throw new Error(result.message || 'Data transaksi tidak ditemukan');
    } catch (error) {
      console.error('Gagal mengambil detail booking:', error);
      throw error;
    }
  }, [API_URL]);

  // ==========================================
  // UPDATE BREAKDOWN HARGA BOOKING
  // Admin bisa edit tiap komponen harga + catat paid/outstanding
  // ==========================================
  const updateBookingPricing = async (orderId, pricingData) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/bookings/${orderId}/pricing`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(pricingData)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = await res.json();
      if (result.success) {
        fetchBookings();
        return true;
      }
      alert(result.error || 'Gagal update harga.');
      return false;
    } catch (error) {
      console.error('Gagal update pricing booking:', error);
      alert('Gagal update harga. Cek koneksi dan coba lagi.');
      return false;
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  return {
    bookings,
    loading,
    fetchBookings,
    updateBookingStatus,
    fetchBookingByOrderId,
    updateBookingPricing
  };
};
