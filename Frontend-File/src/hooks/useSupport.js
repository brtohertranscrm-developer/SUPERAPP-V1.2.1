import { useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch } from '../utils/api';

export const useSupport = () => {
  const [tickets, setTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unavailableMessage, setUnavailableMessage] = useState('');
  const hasFetchedRef = useRef(false);

  const fetchTickets = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiFetch('/api/admin/support/tickets');
      setTickets(Array.isArray(data?.data) ? data.data : []);
      setUnavailableMessage('');
    } catch (error) {
      if (error?.status === 404) {
        setTickets([]);
        setUnavailableMessage('Fitur tiket bantuan belum aktif di backend yang sedang berjalan.');
      } else {
        console.error('Gagal mengambil data tiket bantuan:', error);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateTicketStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'pending' ? 'completed' : 'pending';
    const confirmMsg = currentStatus === 'pending' 
      ? 'Tandai masalah ini sebagai "Selesai"?' 
      : 'Buka kembali tiket ini menjadi "Pending"?';
    
    if (!window.confirm(confirmMsg)) return;

    try {
      const data = await apiFetch(`/api/admin/support/tickets/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });

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
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    fetchTickets();
  }, [fetchTickets]);

  return { tickets, isLoading, updateTicketStatus, unavailableMessage, refetchTickets: fetchTickets };
};
