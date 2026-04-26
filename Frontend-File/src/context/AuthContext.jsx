/* eslint-disable react-refresh/only-export-components */
// src/context/AuthContext.jsx
import { createContext, useState } from 'react';

export const AuthContext = createContext();

const isAdminRole = (role) => role === 'admin' || role === 'superadmin' || role === 'subadmin';
const normalizeAuthUser = (userData) => {
  if (!userData || typeof userData !== 'object') return userData || null;
  const rawKyc = userData.kyc_status ?? userData.kycStatus ?? 'unverified';
  const kycStatus = String(rawKyc || 'unverified').trim().toLowerCase();
  return {
    ...userData,
    kyc_status: kycStatus,
    kycStatus,
  };
};

export const AuthProvider = ({ children }) => {
  
  // State untuk User
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('user');
    // Bersihkan jika ternyata yang tersimpan adalah string 'undefined'
    if (storedUser === 'undefined' || storedUser === 'null') return null;
    try {
      return storedUser ? normalizeAuthUser(JSON.parse(storedUser)) : null;
    } catch {
      localStorage.removeItem('user');
      return null;
    }
  });

  // State untuk Token
  const [token, setToken] = useState(() => {
    const savedToken = localStorage.getItem('token');
    // Bersihkan jika ternyata yang tersimpan adalah string 'undefined'
    if (savedToken === 'undefined' || savedToken === 'null') return null;
    return savedToken || null;
  });

  // Fungsi Login
  const login = (userData, authToken) => {
    const normalizedUser = normalizeAuthUser(userData);
    setUser(normalizedUser);
    setToken(authToken); 
    localStorage.setItem('user', JSON.stringify(normalizedUser));

    // Pisahkan token admin vs user agar request /api/admin tidak "ketuker" token user yang stale.
    if (isAdminRole(normalizedUser?.role)) {
      localStorage.setItem('admin_token', authToken);
      localStorage.setItem('token', authToken); // tetap set untuk kompatibilitas komponen lama
    } else {
      localStorage.setItem('token', authToken);
      localStorage.removeItem('admin_token');
    }
  };

  // Fungsi Logout
  const logout = () => {
    setUser(null);
    setToken(null); 
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('admin_token');
  };

  // Fungsi Update KYC
  const updateKycStatus = (status) => {
    if (user) {
      const normalized = String(status || '').trim().toLowerCase();
      const nextStatus = normalized || user.kyc_status || user.kycStatus || 'unverified';
      const updatedUser = normalizeAuthUser({ ...user, kyc_status: nextStatus, kycStatus: nextStatus });
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateKycStatus }}>
      {children}
    </AuthContext.Provider>
  );
};
