// src/context/AuthContext.jsx
import { createContext, useState } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  
  // 🔥 PERBAIKAN: Baca localStorage secara SINKRON di awal.
  // Ini mencegah nilai 'user' menjadi null sekian detik saat halaman di-refresh.
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem('token') || null;
  });

  // Fungsi Login
  const login = (userData, authToken) => {
    setUser(userData);
    setToken(authToken); 
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', authToken);
  };

  // Fungsi Logout
  const logout = () => {
    setUser(null);
    setToken(null); 
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  // Fungsi Update KYC (Untuk Dashboard User)
  const updateKycStatus = (status) => {
    if (user) {
      const updatedUser = { ...user, kyc_status: status };
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