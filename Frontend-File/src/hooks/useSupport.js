import { useState, useEffect, useCallback } from 'react';

export const useSupport = () => {
  const [tickets, setTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const authToken = localStorage.getItem('admin_token') || localStorage.getItem('token');
  const API_URL = import.meta.env.VITE_API_URL?.trim() || '';

  const fetchTickets = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/support/tickets`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.success) {
        setTickets(data.data);
      }
    } catch (error) {
      console.error('Gagal mengambil data tiket bantuan:', error);
    } finally {
      setIsLoading(false);
    }
  }, [authToken, API_URL]);

  const updateTicketStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'pending' ? 'completed' : 'pending';
    const confirmMsg = currentStatus === 'pending' 
      ? 'Tandai masalah ini sebagai "Selesai"?' 
      : 'Buka kembali tiket ini menjadi "Pending"?';
    
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch(`${API_URL}/api/admin/support/tickets/${id}/status`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      
      if (data.success) {
        fetchTickets(); 
      } else {
        alert('Gagal update tiket.');
      }
    } catch (error) {
      alert('Koneksi ke server gagal.');
    }
  };

  useEffect(() => {
    if (authToken) fetchTickets();
  }, [fetchTickets, authToken]);

  return { tickets, isLoading, updateTicketStatus };
};