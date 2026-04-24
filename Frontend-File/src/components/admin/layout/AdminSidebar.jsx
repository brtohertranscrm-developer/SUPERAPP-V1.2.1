import React, { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Bike, FileText, TrendingUp, Users,
  Settings, LogOut, ClipboardList, Package, DollarSign,
  Calendar, Gift, Ticket, ShieldCheck, LifeBuoy, PackagePlus,
  Truck, Handshake, CarFront,
} from 'lucide-react';
import { AuthContext } from '../../../context/AuthContext';

const AdminSidebar = ({ isMobileMenuOpen, setIsMobileMenuOpen, handleLogout }) => {
  const { user } = useContext(AuthContext) || {};

  const menuSections = [
    {
      title: 'Operasional',
      items: [
        { name: 'Dashboard',       path: '/admin',            key: 'dashboard', icon: <LayoutDashboard size={20} /> },
        { name: 'Tugas Hari Ini',  path: '/admin/staff',      key: 'logistics', icon: <ClipboardList size={20} /> },
        { name: 'Data Pesanan',    path: '/admin/booking',    key: 'booking',   icon: <ClipboardList size={20} /> },
        { name: 'Kelola Jadwal',   path: '/admin/logistics',  key: 'logistics', icon: <Truck size={20} /> },
        { name: 'Tim & Libur',     path: '/admin/manning',    key: 'manning',   icon: <Users size={20} /> },
        { name: 'Armada Motor',    path: '/admin/armada',     key: 'armada',    icon: <Bike size={20} /> },
        { name: 'Armada Mobil',    path: '/admin/cars',       key: 'armada',    icon: <CarFront size={20} /> },
        { name: 'Fleet Inventory', path: '/admin/fleet',      key: 'armada',    icon: <Calendar size={20} /> },
        { name: 'Manajemen Loker', path: '/admin/loker',      key: 'loker',     icon: <Package size={20} /> },
      ],
    },
    {
      title: 'Keuangan',
      items: [
        { name: 'Finance',         path: '/admin/finance',    key: 'finance',   icon: <DollarSign size={20} /> },
      ],
    },
    {
      title: 'Promo & Konten',
      items: [
        { name: 'Dynamic Pricing', path: '/admin/pricing',    key: 'pricing',   icon: <TrendingUp size={20} /> },
        { name: 'Banner Promo',    path: '/admin/promotions', key: 'pricing',   icon: <Ticket size={20} /> },
        { name: 'Partnership',     path: '/admin/partners',   key: 'partners',  icon: <Handshake size={20} /> },
        { name: 'Add-ons & Paket', path: '/admin/addons',     key: 'booking',   icon: <PackagePlus size={20} /> },
        { name: 'Konten Artikel',  path: '/admin/artikel',    key: 'artikel',   icon: <FileText size={20} /> },
        { name: 'Referral',        path: '/admin/referral',   key: 'settings',  icon: <Gift size={20} /> },
      ],
    },
    {
      title: 'Sistem',
      items: [
        { name: 'Data Pelanggan',  path: '/admin/users',      key: 'users',     icon: <Users size={20} /> },
        { name: 'Verifikasi KYC',  path: '/admin/kyc',        key: 'users',     icon: <ShieldCheck size={20} /> },
        { name: 'Tiket Bantuan',   path: '/admin/support',    key: 'settings',  icon: <LifeBuoy size={20} /> },
        { name: 'Pengaturan',      path: '/admin/settings',   key: 'settings',  icon: <Settings size={20} /> },
      ],
    },
  ];

  // Parse permissions dengan aman
  let userPermissions = [];
  try {
    if (typeof user?.permissions === 'string') {
      const parsed = JSON.parse(user.permissions);
      userPermissions = Array.isArray(parsed) ? parsed : [];
    } else if (Array.isArray(user?.permissions)) {
      userPermissions = user.permissions;
    }
  } catch {
    userPermissions = [];
  }

  const isSuperAdmin = user?.role === 'superadmin' || user?.role === 'admin';
  const isPartnerOnly = !isSuperAdmin && userPermissions.includes('partners') && !userPermissions.includes('dashboard');

  const normalizedSections = menuSections.map((section) => ({
    ...section,
    items: section.items.map((item) => {
      if (isPartnerOnly && item.path === '/admin/partners') {
        return { ...item, name: 'Partner Center' };
      }
      return item;
    }),
  }));

  const isMenuAllowed = (menu) => isSuperAdmin || userPermissions.includes(menu.key);

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'A';
  const roleDisplay =
    user?.role === 'superadmin' ? 'Super Admin' :
    user?.role === 'subadmin'   ? 'Sub Admin'   : 'Admin';

  return (
    <aside
      className={`
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
        fixed md:sticky top-0 left-0 z-40 w-64 h-screen
        bg-brand-dark text-white flex flex-col
        shadow-2xl md:shadow-none transition-transform duration-300 ease-in-out
      `}
    >
      {/* Logo */}
      <div className="hidden md:flex p-6 border-b border-white/10 items-center justify-center">
        <div className="font-black text-2xl tracking-tighter text-center">
          BROTHER<span className="text-brand-primary">ADMIN</span>
        </div>
      </div>

      {/* User info */}
      <div className="p-6 border-b border-white/10 flex items-center gap-3">
        <div className="w-10 h-10 bg-brand-primary rounded-full flex items-center justify-center font-bold shrink-0">
          {userInitial}
        </div>
        <div className="overflow-hidden">
          <div className="text-sm font-bold truncate" title={user?.name || roleDisplay}>
            {user?.name || roleDisplay}
          </div>
          <div className="text-[10px] text-gray-400 uppercase tracking-widest flex items-center gap-1 mt-0.5">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Online
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1 scrollbar-hide">
        {normalizedSections.map((section) => {
          const allowedItems = section.items.filter(isMenuAllowed);
          if (allowedItems.length === 0) return null;

          return (
            <div key={section.title} className="mb-6">
              <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest px-4 mb-3">
                {section.title}
              </div>

              <div className="space-y-1">
                {allowedItems.map((menu) => (
                  <NavLink
                    key={menu.path}
                    to={menu.path}
                    end={menu.path === '/admin'}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                        isActive
                          ? 'bg-brand-primary text-white shadow-md shadow-rose-900/20'
                          : 'text-gray-400 hover:bg-white/5 hover:text-white'
                      }`
                    }
                  >
                    {menu.icon}
                    {menu.name}
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Logout */}
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
