import { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export const useUserKyc = () => {
  const { user, submitKyc } = useContext(AuthContext) || {};
  const navigate = useNavigate();
  
  const [nik, setNik] = useState('');
  const [ktpFileName, setKtpFileName] = useState('');
  const [selfieFileName, setSelfieFileName] = useState('');

  // Proteksi Halaman: Jika belum login, tendang ke halaman login
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (nik && ktpFileName && selfieFileName) {
      if (submitKyc) submitKyc(); // Mengubah status menjadi 'pending'
    } else {
      alert('Mohon lengkapi semua data dan dokumen.');
    }
  };

  return {
    user, navigate,
    nik, setNik,
    ktpFileName, setKtpFileName,
    selfieFileName, setSelfieFileName,
    handleSubmit
  };
};