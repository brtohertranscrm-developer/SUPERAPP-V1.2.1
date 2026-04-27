import React, { useContext } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LogOut, Ticket, BarChart3 } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

export default function VendorLayout() {
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext) || {};

  const handleLogout = () => {
    if (window.confirm('Keluar dari Vendor Portal?')) {
      logout?.();
      localStorage.removeItem('token');
      localStorage.removeItem('admin_token');
      navigate('/');
    }
  };

  const initial = user?.name ? String(user.name).charAt(0).toUpperCase() : 'V';
  const vendorName = user?.vendor_name ? String(user.vendor_name) : null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-900">
      <aside className="w-full md:w-72 bg-slate-900 text-white p-5 md:p-6">
        <div className="font-black text-xl tracking-tight">
          BROTHERS <span className="text-rose-400">VENDOR</span>
        </div>

        <div className="mt-6 p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-rose-500 flex items-center justify-center font-black">
            {initial}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-black truncate">{vendorName || (user?.name || 'Vendor')}</div>
            <div className="text-[10px] text-slate-300 font-bold truncate">
              {vendorName ? `${user?.name || ''} • ${user?.email || ''}` : (user?.email || '')}
            </div>
          </div>
        </div>

        <nav className="mt-6 space-y-2">
          <NavLink
            to="/vendor/tickets"
            end
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-2xl font-black text-sm transition ${
                isActive ? 'bg-rose-500 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            <Ticket size={18} /> Voucher
          </NavLink>
          <NavLink
            to="/vendor/reports"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-2xl font-black text-sm transition ${
                isActive ? 'bg-rose-500 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            <BarChart3 size={18} /> Rekap
          </NavLink>
        </nav>

        <button
          type="button"
          onClick={handleLogout}
          className="mt-8 w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-black text-sm text-rose-300 hover:bg-rose-500/10 hover:text-rose-200 transition"
        >
          <LogOut size={18} /> Logout
        </button>
      </aside>

      <main className="flex-1 p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
