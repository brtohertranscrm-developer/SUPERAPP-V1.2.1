import { useContext, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { UserCircle, LogOut, Menu, X, ChevronRight } from 'lucide-react';
import { getAdminLandingPath } from '../utils/adminNavigation';

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  
  // State untuk mengontrol Mobile Menu
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Otomatis menutup mobile menu jika rute (URL) berubah
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  // Mencegah scroll pada body ketika mobile menu terbuka
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      // Reset ke default browser agar tidak nyangkut di iOS/bfcache restore
      document.body.style.overflow = '';
    }

    return () => {
      // Safety: pastikan scroll tidak terkunci saat komponen unmount / route swap.
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  // ========================================================
  // FUNGSI PINTAR PENENTU ARAH DASHBOARD BERDASARKAN ROLE
  // ========================================================
  const getDashboardUrl = (userData) => {
    if (!userData) return '/login';
    if (userData.role === 'admin' || userData.role === 'superadmin' || userData.role === 'subadmin') {
      return getAdminLandingPath(userData);
    }
    return '/dashboard'; 
  };

  // Fungsi untuk menampilkan label Role yang lebih rapi
  const getRoleLabel = (role) => {
    if (role === 'superadmin') return 'Super Administrator';
    if (role === 'admin') return 'Administrator';
    if (role === 'subadmin') return 'Sub-Admin / Vendor';
    return 'Pengguna Terverifikasi';
  };

  return (
    <>
      <nav className="bg-white shadow-sm sticky top-0 z-40 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            
            {/* Logo Brother Trans */}
            <div 
              onClick={() => navigate('/')} 
              className="flex-shrink-0 flex items-center gap-2 cursor-pointer group z-50"
            >
              <div className="w-10 h-10 bg-brand-primary text-white rounded-xl flex items-center justify-center font-bold text-xl shadow-sm group-hover:bg-brand-secondary transition-colors">
                B
              </div>
              <span className="text-2xl font-extrabold text-brand-dark tracking-tight">
                Brother<span className="text-brand-primary">Trans</span>
              </span>
            </div>

            {/* Menu Navigasi Tengah (Tampil HANYA di Desktop) */}
            <div className="hidden lg:flex items-center gap-8 font-semibold text-gray-500 text-sm">
              <span onClick={() => navigate('/motor')} className="hover:text-brand-primary cursor-pointer transition-colors">Rental Motor</span>
              <span onClick={() => navigate('/loker')} className="hover:text-brand-primary cursor-pointer transition-colors">Smart Loker</span>
              <span onClick={() => navigate('/artikel')} className="hover:text-brand-primary cursor-pointer transition-colors">Artikel & Tips</span>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              
              {/* Logika Tampilan Berdasarkan Status Login (Desktop & Tablet) */}
              <div className="hidden md:flex items-center gap-2">
                {user ? (
                  <>
                    <button 
                      // PERBAIKAN: Gunakan fungsi getDashboardUrl
                      onClick={() => navigate(getDashboardUrl(user))} 
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-50 text-brand-primary font-bold hover:bg-rose-100 transition-colors"
                    >
                      <UserCircle size={20} />
                      <span className="capitalize">{user.name}</span>
                    </button>
                    <button 
                      onClick={() => {
                        logout();
                        navigate('/'); 
                      }}
                      className="p-2.5 text-gray-400 hover:text-brand-primary transition-colors bg-gray-50 rounded-xl hover:bg-rose-50"
                      title="Keluar"
                    >
                      <LogOut size={20} />
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => navigate('/login')}
                    className="flex items-center justify-center px-5 py-2.5 rounded-xl bg-brand-primary text-white hover:bg-brand-secondary transition-all shadow-md shadow-rose-200 font-semibold text-sm gap-2"
                  >
                    <UserCircle size={18} />
                    <span>Masuk / Daftar</span>
                  </button>
                )}
              </div>

              {/* Tombol Hamburger Menu (HANYA tampil di Mobile & Tablet kecil) */}
              <button 
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden p-2 text-gray-600 hover:text-brand-primary hover:bg-rose-50 rounded-xl transition-colors"
              >
                <Menu size={28} />
              </button>

            </div>
          </div>
        </div>
      </nav>

      {/* ========================================== */}
      {/* IMMERSIVE MOBILE MENU OVERLAY */}
      {/* ========================================== */}
      <div 
        className={`fixed inset-0 z-[100] bg-white transition-transform duration-500 ease-in-out lg:hidden ${
          isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full relative">
          
          {/* Header Mobile Menu */}
          <div className="flex justify-between items-center h-20 px-4 sm:px-6 border-b border-gray-100">
             <div className="flex-shrink-0 flex items-center gap-2">
              <div className="w-10 h-10 bg-brand-primary text-white rounded-xl flex items-center justify-center font-bold text-xl shadow-sm">
                B
              </div>
              <span className="text-2xl font-extrabold text-brand-dark tracking-tight">
                Menu<span className="text-brand-primary">.</span>
              </span>
            </div>
            <button 
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 text-gray-400 hover:text-rose-500 bg-gray-50 hover:bg-rose-50 rounded-xl transition-colors"
            >
              <X size={28} />
            </button>
          </div>

          {/* Links Immersive */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 flex flex-col gap-6">
            
            <button 
              onClick={() => navigate('/motor')}
              className="w-full flex items-center justify-between py-4 border-b border-gray-100 text-left group"
            >
              <span className="text-3xl sm:text-4xl font-black text-slate-800 group-hover:text-brand-primary transition-colors tracking-tight">Rental Motor</span>
              <ChevronRight size={32} className="text-gray-300 group-hover:text-brand-primary group-hover:translate-x-2 transition-all" />
            </button>
            
            <button 
              onClick={() => navigate('/loker')}
              className="w-full flex items-center justify-between py-4 border-b border-gray-100 text-left group"
            >
              <span className="text-3xl sm:text-4xl font-black text-slate-800 group-hover:text-brand-primary transition-colors tracking-tight">Smart Loker</span>
              <ChevronRight size={32} className="text-gray-300 group-hover:text-brand-primary group-hover:translate-x-2 transition-all" />
            </button>
            
            <button 
              onClick={() => navigate('/artikel')}
              className="w-full flex items-center justify-between py-4 border-b border-gray-100 text-left group"
            >
              <span className="text-3xl sm:text-4xl font-black text-slate-800 group-hover:text-brand-primary transition-colors tracking-tight">Artikel & Tips</span>
              <ChevronRight size={32} className="text-gray-300 group-hover:text-brand-primary group-hover:translate-x-2 transition-all" />
            </button>

          </div>

          {/* Footer Mobile Menu (Auth Actions) */}
          <div className="p-6 sm:p-8 bg-gray-50 mt-auto">
            {user ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-rose-100 text-brand-primary rounded-full flex items-center justify-center font-black text-xl">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 capitalize">{user.name}</p>
                    {/* PERBAIKAN: Gunakan fungsi getRoleLabel */}
                    <p className="text-xs text-gray-500 font-medium">
                      {getRoleLabel(user.role)}
                    </p>
                  </div>
                </div>
                <button 
                  // PERBAIKAN: Gunakan fungsi getDashboardUrl
                  onClick={() => navigate(getDashboardUrl(user))}
                  className="w-full py-4 rounded-2xl bg-brand-primary text-white font-black hover:bg-brand-secondary transition-colors"
                >
                  Masuk ke Dashboard
                </button>
                <button 
                  onClick={() => { logout(); navigate('/'); }}
                  className="w-full py-4 rounded-2xl bg-white border border-gray-200 text-rose-500 font-black flex items-center justify-center gap-2"
                >
                  <LogOut size={20} /> Keluar Akun
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4 text-center">
                <p className="text-sm font-medium text-gray-500">Punya akun Brother Trans?</p>
                <button 
                  onClick={() => navigate('/login')}
                  className="w-full py-4 rounded-2xl bg-brand-primary text-white font-black hover:bg-brand-secondary transition-colors shadow-xl shadow-rose-500/20"
                >
                  Masuk / Daftar Sekarang
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
