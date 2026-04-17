import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export const AdminRoute = ({ children }) => {
  const { user } = useContext(AuthContext);

  // Jika tidak ada user login, lempar ke halaman login
  if (!user) return <Navigate to="/login" replace />;
  
  // Izinkan masuk ke halaman admin JIKA role-nya adalah admin, superadmin, ATAU subadmin
  if (user.role !== 'admin' && user.role !== 'superadmin' && user.role !== 'subadmin') {
    // Jika rolenya cuma 'user' pelanggan biasa, buang ke dashboard pelanggan
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};