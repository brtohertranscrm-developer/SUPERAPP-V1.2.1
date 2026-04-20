// src/context/AuthContext.jsx
import { createContext, useState } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  
  // State untuk User
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('user');
    // Bersihkan jika ternyata yang tersimpan adalah string 'undefined'
    if (storedUser === 'undefined' || storedUser === 'null') return null;
    return storedUser ? JSON.parse(storedUser) : null;
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

  // Fungsi Update KYC
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