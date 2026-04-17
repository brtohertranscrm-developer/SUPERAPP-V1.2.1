import React, { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, Bike, FileText, TrendingUp, Users, 
  Settings, LogOut, ClipboardList, Package 
} from 'lucide-react';
import { AuthContext } from '../../../context/AuthContext';

const AdminSidebar = ({ isMobileMenuOpen, setIsMobileMenuOpen, handleLogout }) => {
  // Tambahkan default object {} agar tidak error saat context masih loading
  const { user } = useContext(AuthContext) || {};

  const adminMenus = [
    { name: 'Dashboard', path: '/admin', key: 'dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'Data Pesanan', path: '/admin/booking', key: 'booking', icon: <ClipboardList size={20} /> },
    { name: 'Data Pelanggan', path: '/admin/users', key: 'users', icon: <Users size={20} /> },
    { name: 'Finance', path: '/admin/finance', key: 'finance', icon: <TrendingUp size={20} /> },
    { name: 'Manajemen Armada', path: '/admin/armada', key: 'armada', icon: <Bike size={20} /> },
    { name: 'Manajemen Loker', path: '/admin/loker', key: 'loker', icon: <Package size={20} /> },
    { name: 'Dynamic Pricing', path: '/admin/pricing', key: 'pricing', icon: <TrendingUp size={20} /> },
    { name: 'Konten Artikel', path: '/admin/artikel', key: 'artikel', icon: <FileText size={20} /> },
    { name: 'Referral', path: '/admin/referral', key: 'referral', icon: <TrendingUp size={20} /> },
    { name: 'Pengaturan', path: '/admin/settings', key: 'settings', icon: <Settings size={20} /> },
  ];

  // Logic aman untuk memproses permissions agar tidak terjadi white screen (crash)
  let userPermissions = [];
  try {
    if (typeof user?.permissions === 'string') {
      const parsed = JSON.parse(user.permissions);
      userPermissions = Array.isArray(parsed) ? parsed : [];
    } else if (Array.isArray(user?.permissions)) {
      userPermissions = user.permissions;
    }
  } catch (e) {
    userPermissions = [];
  }

  // Izinkan jika dia superadmin ATAU admin lama
  const isSuperAdmin = user?.role === 'superadmin' || user?.role === 'admin';

  // Filter Menu
  const allowedMenus = adminMenus.filter(menu => isSuperAdmin || userPermissions.includes(menu.key));

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'A';
  const roleDisplay = user?.role === 'superadmin' ? 'Super Admin' : (user?.role === 'subadmin' ? 'Sub Admin' : 'Admin');

  return (
    <aside className={`
      ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} 
      md:translate-x-0 
      fixed md:sticky top-0 left-0 z-40 w-64 h-screen bg-brand-dark text-white flex flex-col shadow-2xl md:shadow-none transition-transform duration-300 ease-in-out
    `}>
      <div className="hidden md:flex p-6 border-b border-white/10 items-center justify-center">
        <div className="font-black text-2xl tracking-tighter text-center">
          BROTHER<span className="text-brand-primary">ADMIN</span>
        </div>
      </div>

      <div className="p-6 border-b border-white/10 flex items-center gap-3">
        <div className="w-10 h-10 bg-brand-primary rounded-full flex items-center justify-center font-bold">
          {userInitial}
        </div>
        <div className="overflow-hidden">
          <div className="text-sm font-bold truncate" title={user?.name || roleDisplay}>
            {user?.name || roleDisplay}
          </div>
          <div className="text-[10px] text-gray-400 uppercase tracking-widest flex items-center gap-1 mt-0.5">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div> Online
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-4 space-y-2 scrollbar-hide">
        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest px-4 mb-2">Operasional</div>
        
        {allowedMenus.map((menu) => (
          <NavLink
            key={menu.key}
            to={menu.path}
            end={menu.path === '/admin'} 
            onClick={() => setIsMobileMenuOpen(false)}
            className={({ isActive }) => `
              flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all
              ${isActive 
                ? 'bg-brand-primary text-white shadow-md shadow-rose-900/20' 
                : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }
            `}
          >
            {menu.icon}
            {menu.name}
          </NavLink>
        ))}
      </div>

      <div className="p-4 border-t border-white/10">
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-xl font-bold text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
        >
          <LogOut size={20} /> Logout Admin
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;