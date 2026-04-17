import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export const useUserSupport = () => {
  const navigate = useNavigate();
  const { user, token } = useContext(AuthContext) || {};
  const authToken = token || localStorage.getItem('token');

  const [formData, setFormData] = useState({
    subject: 'Kendala Kendaraan di Jalan',
    order_id: '',
    message: ''
  });
  
  const [activeOrder, setActiveOrder] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [ticketNumber, setTicketNumber] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

  // Guard: Harus Login
  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  // Ambil data order aktif
  useEffect(() => {
    const fetchActiveOrder = async () => {
      try {
        const response = await fetch(`${API_URL}/api/dashboard/me`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const result = await response.json();
        if (result.success && result.data.activeOrder) {
          setActiveOrder(result.data.activeOrder);
          setFormData(prev => ({ ...prev, order_id: result.data.activeOrder.id }));
        }
      } catch (error) {
        console.error('Gagal mengambil data order aktif');
      }
    };
    if (authToken) fetchActiveOrder();
  }, [authToken, API_URL]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.message.trim()) return alert('Pesan komplain tidak boleh kosong.');

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/support/tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(formData)
      });
      const result = await response.json();

      if (result.success) {
        setTicketNumber(result.ticket_number);
        setIsSuccess(true);
      } else {
        alert(result.error || 'Gagal mengirim tiket bantuan.');
      }
    } catch (error) {
      alert('Terjadi kesalahan koneksi ke server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    user, navigate,
    formData, handleChange,
    activeOrder,
    isSubmitting, isSuccess, ticketNumber,
    handleSubmit
  };
};