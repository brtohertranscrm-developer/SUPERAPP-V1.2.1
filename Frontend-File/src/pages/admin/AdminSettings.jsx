import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { Shield, Plus, Trash2, X, Check, Save } from 'lucide-react';

const availableMenus = [
  { key: 'dashboard', label: 'Dashboard Stats' },
  { key: 'booking', label: 'Data Pesanan (Booking)' },
  { key: 'finance', label: 'Finance & Laporan Keuangan' },
  { key: 'armada', label: 'Manajemen Armada & Unit' },
  { key: 'loker', label: 'Manajemen Loker' },
  { key: 'pricing', label: 'Dynamic Pricing & Promo' },
  { key: 'artikel', label: 'Konten Artikel' },
  { key: 'users', label: 'Data Pelanggan & KYC' },
  { key: 'settings', label: 'Pengaturan & Akses' },
];

const AdminSettings = () => {
  const { token, user } = useContext(AuthContext);
  const [admins, setAdmins] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL; // Tambahan variabel env
  
  // Form State
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', role: 'subadmin', permissions: []
  });

  const fetchAdmins = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/admins`, { // URL Dinamis
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setAdmins(data.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchAdmins(); }, []);

  const handleCheckboxChange = (key) => {
    setFormData(prev => {
      const isChecked = prev.permissions.includes(key);
      if (isChecked) {
        return { ...prev, permissions: prev.permissions.filter(p => p !== key) };
      } else {
        return { ...prev, permissions: [...prev.permissions, key] };
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/api/admin/admins`, { // URL Dinamis
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        alert('Berhasil membuat akun admin!');
        setIsModalOpen(false);
        setFormData({ name: '', email: '', password: '', role: 'subadmin', permissions: [] });
        fetchAdmins();
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('Terjadi kesalahan sistem.');
    }
  };

  const handleDelete = async (id) => {
    if(!window.confirm('Yakin ingin menghapus akun ini?')) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/admins/${id}`, { // URL Dinamis
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) fetchAdmins();
      else alert(data.error);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-brand-dark">Pengaturan Sistem</h1>
          <p className="text-gray-500 text-sm mt-1">Kelola hak akses dan konfigurasi utama.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-brand-primary text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-rose-700 transition"
        >
          <Plus size={20} /> Tambah Admin
        </button>
      </div>

      {/* Tabel Daftar Admin */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
          <Shield className="text-brand-primary" /> Daftar Admin & Sub-Admin
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="p-4 rounded-l-xl font-bold">Nama</th>
                <th className="p-4 font-bold">Email</th>
                <th className="p-4 font-bold">Role</th>
                <th className="p-4 font-bold">Hak Akses Menu</th>
                <th className="p-4 rounded-r-xl font-bold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((adm) => (
                <tr key={adm.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                  <td className="p-4 font-bold">{adm.name}</td>
                  <td className="p-4 text-gray-500">{adm.email}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${adm.role === 'superadmin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                      {adm.role.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-4">
                    {adm.role === 'superadmin' ? (
                      <span className="text-xs text-gray-400">Akses Penuh (All Menus)</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {(() => {
                          try {
                            const perms = JSON.parse(adm.permissions || '[]');
                            return perms.map(p => (
                              <span key={p} className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase">{p}</span>
                            ));
                          } catch (e) { return '-'; }
                        })()}
                      </div>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    {adm.role !== 'superadmin' && user?.id !== adm.id && (
                      <button onClick={() => handleDelete(adm.id)} className="text-red-400 hover:text-red-600 p-2">
                        <Trash2 size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL TAMBAH ADMIN */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white p-6 border-b border-gray-100 flex justify-between items-center z-10">
              <h3 className="font-black text-xl">Buat Akun Admin Baru</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-500"><X size={24}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Nama Lengkap</label>
                  <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-brand-primary" placeholder="Cth: Vendor Artikel"/>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Email Login</label>
                  <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-brand-primary" placeholder="vendor@brother.com"/>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Password Login</label>
                <input type="password" required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-brand-primary" placeholder="Minimal 6 karakter"/>
              </div>

              <div className="bg-brand-dark rounded-2xl p-6 text-white mt-4">
                <div className="font-bold mb-4 flex items-center gap-2 text-brand-primary">
                  <Shield size={18} /> Checklist Hak Akses Menu
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {availableMenus.map(menu => (
                    <label key={menu.key} className="flex items-center gap-3 cursor-pointer group">
                      <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${formData.permissions.includes(menu.key) ? 'bg-brand-primary border-brand-primary' : 'border-gray-500 group-hover:border-white'}`}>
                        {formData.permissions.includes(menu.key) && <Check size={14} className="text-white"/>}
                      </div>
                      <span className="text-sm text-gray-300 group-hover:text-white transition-colors">{menu.label}</span>
                      <input type="checkbox" className="hidden" checked={formData.permissions.includes(menu.key)} onChange={() => handleCheckboxChange(menu.key)} />
                    </label>
                  ))}
                </div>
              </div>

              <button type="submit" className="w-full bg-brand-primary text-white py-4 rounded-xl font-bold text-lg hover:bg-rose-700 transition">
                Simpan & Beri Akses
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSettings;