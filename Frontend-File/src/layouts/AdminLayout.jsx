import React, { useState, useContext } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import AdminMobileHeader from '../components/admin/layout/AdminMobileHeader';
import AdminSidebar from '../components/admin/layout/AdminSidebar';

export default function AdminLayout() {
  const navigate = useNavigate();
  const { logout } = useContext(AuthContext) || {}; 
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    if (window.confirm('Yakin ingin keluar dari panel admin?')) {
      if (logout) logout(); // Hapus state login jika ada
      localStorage.removeItem('token');
      localStorage.removeItem('admin_token');
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans text-brand-dark">
      
      {/* HEADER MOBILE */}
      <AdminMobileHeader 
        isMobileMenuOpen={isMobileMenuOpen} 
        setIsMobileMenuOpen={setIsMobileMenuOpen} 
      />

      {/* SIDEBAR NAVIGASI */}
      <AdminSidebar 
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        handleLogout={handleLogout}
      />

      {/* OVERLAY GELAP UNTUK MOBILE */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm" 
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}

      {/* AREA KONTEN HALAMAN */}
      <main className="flex-1 w-full overflow-x-hidden p-4 md:p-8 relative">
        <div className="max-w-6xl mx-auto">
          {/* Outlet adalah tempat di mana AdminDashboard, AdminBooking, dll akan muncul */}
          <Outlet /> 
        </div>
      </main>

    </div>
  );
}