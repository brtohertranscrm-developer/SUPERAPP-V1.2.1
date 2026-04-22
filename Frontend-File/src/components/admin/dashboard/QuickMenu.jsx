import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Bike, Package, ClipboardList, Ticket, LifeBuoy, FileText, TrendingUp, DollarSign, Calendar, ShieldCheck } from 'lucide-react';
import { AuthContext } from '../../../context/AuthContext';

const QuickMenu = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext) || {};

  const adminMenus = [
    // Operasional
    { section: 'Operasional', name: 'Data Pesanan',   path: '/admin/booking',    key: 'booking',  icon: ClipboardList, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { section: 'Operasional', name: 'Armada Motor',   path: '/admin/armada',     key: 'armada',   icon: Bike,          color: 'text-rose-600',   bg: 'bg-rose-50' },
    { section: 'Operasional', name: 'Fleet Inventory',path: '/admin/fleet',      key: 'armada',   icon: Calendar,      color: 'text-teal-600',   bg: 'bg-teal-50' },
    { section: 'Operasional', name: 'Smart Loker',    path: '/admin/loker',      key: 'loker',    icon: Package,       color: 'text-blue-600',   bg: 'bg-blue-50' },

    // Keuangan
    { section: 'Keuangan',    name: 'Finance',        path: '/admin/finance',    key: 'finance',  icon: DollarSign,    color: 'text-green-600',  bg: 'bg-green-50' },

    // Promo & Konten
    { section: 'Promo & Konten', name: 'Harga Dinamis',  path: '/admin/pricing',    key: 'pricing',  icon: TrendingUp, color: 'text-orange-600', bg: 'bg-orange-50' },
    { section: 'Promo & Konten', name: 'Banner Promo',   path: '/admin/promotions', key: 'pricing',  icon: Ticket,     color: 'text-emerald-600',bg: 'bg-emerald-50' },
    { section: 'Promo & Konten', name: 'Konten Artikel', path: '/admin/artikel',    key: 'artikel',  icon: FileText,   color: 'text-cyan-600',   bg: 'bg-cyan-50' },

    // Sistem
    { section: 'Sistem', name: 'Data Pelanggan', path: '/admin/users', key: 'users', icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
    { section: 'Sistem', name: 'Verifikasi KYC', path: '/admin/kyc',   key: 'users', icon: ShieldCheck, color: 'text-amber-600', bg: 'bg-amber-50' },
    { section: 'Sistem', name: 'Tiket Bantuan',  path: '/admin/support',    key: 'settings',  icon: LifeBuoy,      color: 'text-slate-700',  bg: 'bg-slate-100' },
  ];

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

  const isSuperAdmin = user?.role === 'superadmin' || user?.role === 'admin';
  const allowedMenus = adminMenus.filter(menu => isSuperAdmin || userPermissions.includes(menu.key));

  if (allowedMenus.length === 0) return null;

  const sectionOrder = ['Operasional', 'Keuangan', 'Promo & Konten', 'Sistem'];
  const grouped = sectionOrder
    .map((section) => ({
      section,
      items: allowedMenus.filter((m) => m.section === section),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="mb-12">
      <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 px-1">Manajemen Cepat</h2>
      <div className="space-y-8">
        {grouped.map((group) => (
          <div key={group.section}>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 px-1">
              {group.section}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {group.items.map((menu) => {
                const Icon = menu.icon;
                return (
                  <button
                    key={menu.path}
                    onClick={() => navigate(menu.path)}
                    className="bg-white p-5 rounded-[2.25rem] shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center gap-3 hover:border-rose-500/40 hover:shadow-xl transition-all group active:scale-95"
                  >
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${menu.bg} ${menu.color} group-hover:-translate-y-1 transition-transform shadow-inner`}>
                      <Icon size={26} />
                    </div>
                    <span className="font-black text-slate-900 text-[11px] sm:text-xs leading-tight">{menu.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default QuickMenu;
