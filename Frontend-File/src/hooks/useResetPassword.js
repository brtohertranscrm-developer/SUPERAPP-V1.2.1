import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export const useResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

  // Cek keberadaan token saat halaman pertama dimuat
  useEffect(() => {
    if (!token) {
      setStatus({ 
        type: 'error', 
        message: 'Tautan tidak valid atau token hilang. Silakan minta tautan reset yang baru di halaman Login.' 
      });
    }
  }, [token]);

  const handleResetSubmit = async (newPassword, confirmPassword) => {
    if (newPassword !== confirmPassword) {
      setStatus({ type: 'error', message: 'Kata sandi tidak cocok. Silakan periksa kembali.' });
      return false;
    }
    if (newPassword.length < 6) {
      setStatus({ type: 'error', message: 'Kata sandi minimal harus 6 karakter.' });
      return false;
    }

    setIsLoading(true);
    setStatus({ type: '', message: '' });

    try {
      const response = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword })
      });

      const result = await response.json();

      if (result.success) {
        setStatus({ type: 'success', message: 'Kata sandi berhasil diperbarui! Mengalihkan ke halaman login...' });
        setTimeout(() => {
          navigate('/login');
        }, 3000);
        return true;
      } else {
        setStatus({ type: 'error', message: result.error || 'Gagal mereset kata sandi. Token mungkin kedaluwarsa.' });
        return false;
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Gagal terhubung ke server. Pastikan backend menyala.' });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return { token, isLoading, status, handleResetSubmit };
};