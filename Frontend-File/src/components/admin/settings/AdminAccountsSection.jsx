import React, { useEffect, useState } from 'react';
import { Check, Copy, Pencil, Plus, Search, Shield, Trash2, X } from 'lucide-react';
import { API_URL, availableMenus, permissionPresets } from './settingsConstants';

export default function AdminAccountsSection({ token, user }) {
  const [admins, setAdmins] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [roleFilter, setRoleFilter] = useState('all');
  const [adminSearch, setAdminSearch] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'subadmin',
    permissions: [],
  });

  const fetchAdmins = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/admins`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setAdmins(data.data);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
    }
  };

  useEffect(() => { fetchAdmins(); }, []);

  const resetAdminForm = () => {
    setEditingAdmin(null);
    setFormData({ name: '', email: '', phone: '', password: '', role: 'subadmin', permissions: [] });
  };

  const openCreateModal = () => {
    resetAdminForm();
    setIsModalOpen(true);
  };

  const openEditModal = (adm) => {
    let perms = [];
    try {
      perms = JSON.parse(adm.permissions || '[]');
    } catch {
      perms = [];
    }

    setEditingAdmin(adm);
    setFormData({
      name: adm.name || '',
      email: adm.email || '',
      phone: adm.phone && adm.phone !== '-' ? adm.phone : '',
      password: '',
      role: adm.role || 'subadmin',
      permissions: Array.isArray(perms) ? perms : [],
    });
    setIsModalOpen(true);
  };

  const handleCheckboxChange = (key) => {
    setFormData((prev) => {
      const isChecked = prev.permissions.includes(key);
      return {
        ...prev,
        permissions: isChecked
          ? prev.permissions.filter((p) => p !== key)
          : [...prev.permissions, key],
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const endpoint = editingAdmin
        ? `${API_URL}/api/admin/admins/${editingAdmin.id}`
        : `${API_URL}/api/admin/admins`;
      const method = editingAdmin ? 'PUT' : 'POST';
      const payload = {
        ...formData,
        phone: formData.phone?.trim() || '-',
      };

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        alert(editingAdmin ? 'Akun admin berhasil diperbarui!' : 'Berhasil membuat akun admin!');
        setIsModalOpen(false);
        resetAdminForm();
        fetchAdmins();
      } else {
        alert(data.error);
      }
    } catch {
      alert('Terjadi kesalahan sistem.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Yakin ingin menghapus akun ini?')) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/admins/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) fetchAdmins();
      else alert(data.error);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
    }
  };

  const visibleAdmins = admins.filter((adm) => {
    const matchRole = roleFilter === 'all' ? true : adm.role === roleFilter;
    const q = adminSearch.trim().toLowerCase();
    const matchSearch = !q
      ? true
      : `${adm.name || ''} ${adm.email || ''}`.toLowerCase().includes(q);
    return matchRole && matchSearch;
  });

  const permissionTemplateOptions = admins.filter((adm) => !editingAdmin || adm.id !== editingAdmin.id);

  const applyPermissionTemplate = (adminId) => {
    const sourceAdmin = admins.find((adm) => adm.id === adminId);
    if (!sourceAdmin) return;
    let perms = [];
    try {
      perms = JSON.parse(sourceAdmin.permissions || '[]');
    } catch {
      perms = [];
    }
    setFormData((prev) => ({
      ...prev,
      permissions: Array.isArray(perms) ? perms : [],
    }));
  };

  return (
    <>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-brand-dark">Pengaturan Sistem</h1>
          <p className="text-gray-500 text-sm mt-1">Kelola hak akses, konfigurasi, dan backup database.</p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-brand-primary text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-rose-700 transition"
          type="button"
        >
          <Plus size={20} /> Tambah Admin
        </button>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Shield className="text-brand-primary" /> Daftar Admin & Sub-Admin
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Edit role dan hak akses langsung dari daftar akun, tanpa perlu hapus akun lama.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={adminSearch}
                onChange={(e) => setAdminSearch(e.target.value)}
                placeholder="Cari nama atau email..."
                className="bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-bold text-slate-700 outline-none w-56"
              />
            </div>
            <span className="text-xs font-black uppercase tracking-widest text-slate-400">Filter Role</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-slate-700 outline-none"
            >
              <option value="all">Semua</option>
              <option value="superadmin">Superadmin</option>
              <option value="admin">Admin</option>
              <option value="subadmin">Subadmin</option>
            </select>
          </div>
        </div>

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
              {visibleAdmins.map((adm) => (
                <tr key={adm.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                  <td className="p-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold">{adm.name}</span>
                      {user?.id === adm.id && (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest">
                          Akun Saya
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-gray-500">{adm.email}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      adm.role === 'superadmin' || adm.role === 'admin'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {String(adm.role || '').toUpperCase()}
                    </span>
                  </td>
                  <td className="p-4">
                    {adm.role === 'superadmin' || adm.role === 'admin' ? (
                      <span className="text-xs text-gray-400">Akses Penuh (All Menus)</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {(() => {
                          try {
                            const perms = JSON.parse(adm.permissions || '[]');
                            return perms.map((p) => (
                              <span key={p} className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase">{p}</span>
                            ));
                          } catch { return '-'; }
                        })()}
                      </div>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {adm.role !== 'superadmin' && (
                        <button
                          onClick={() => openEditModal(adm)}
                          className="text-slate-400 hover:text-brand-primary p-2"
                          title="Edit role & hak akses"
                          type="button"
                        >
                          <Pencil size={18} />
                        </button>
                      )}
                      {adm.role !== 'superadmin' && adm.role !== 'admin' && user?.id !== adm.id && (
                        <button
                          onClick={() => handleDelete(adm.id)}
                          className="text-red-400 hover:text-red-600 p-2"
                          title="Hapus akun"
                          type="button"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {visibleAdmins.length === 0 && (
                <tr>
                  <td className="p-5 text-slate-400 font-bold" colSpan={5}>
                    Tidak ada akun admin untuk filter role ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white p-6 border-b border-gray-100 flex justify-between items-center z-10">
              <h3 className="font-black text-xl">
                {editingAdmin ? 'Edit Role & Hak Akses Admin' : 'Buat Akun Admin Baru'}
              </h3>
              <button onClick={() => { setIsModalOpen(false); resetAdminForm(); }} className="text-gray-400 hover:text-red-500" type="button">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-brand-primary"
                    placeholder="Cth: Vendor Artikel"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Email Login</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-brand-primary"
                    placeholder="vendor@brother.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Nomor HP</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-brand-primary"
                  placeholder="Opsional, untuk kontak internal"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  {editingAdmin ? 'Password Baru (opsional)' : 'Password Login'}
                </label>
                <input
                  type="password"
                  required={!editingAdmin}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-brand-primary"
                  placeholder={editingAdmin ? 'Kosongkan jika tidak ingin mengubah password' : 'Minimal 6 karakter'}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Role Akun</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-brand-primary"
                >
                  <option value="subadmin">Subadmin</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <div className="flex items-center gap-2 text-slate-700 font-bold text-sm mb-3">
                  <Copy size={16} className="text-brand-primary" /> Salin Hak Akses dari Akun Lain
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) {
                        applyPermissionTemplate(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-brand-primary"
                  >
                    <option value="">Pilih akun untuk salin permission...</option>
                    {permissionTemplateOptions.map((adm) => (
                      <option key={adm.id} value={adm.id}>
                        {adm.name} - {adm.role}
                      </option>
                    ))}
                  </select>
                  <div className="text-xs text-slate-500 font-medium sm:max-w-[220px]">
                    Cocok untuk bikin akun baru dengan role serupa tanpa checklist satu per satu.
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4">
                <div className="flex items-center gap-2 text-slate-700 font-bold text-sm mb-3">
                  <Shield size={16} className="text-brand-primary" /> Preset Permission Cepat
                </div>
                <div className="flex flex-wrap gap-2">
                  {permissionPresets.map((preset) => (
                    <button
                      key={preset.key}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, permissions: preset.permissions }))}
                      className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-brand-primary hover:text-white text-slate-700 text-xs font-black transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-500 font-medium mt-3">
                  Pilih preset lalu sesuaikan checklist jika perlu.
                </p>
              </div>

              <div className="bg-brand-dark rounded-2xl p-6 text-white">
                <div className="font-bold mb-4 flex items-center gap-2 text-brand-primary">
                  <Shield size={18} /> Checklist Hak Akses Menu
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {availableMenus.map((menu) => (
                    <label key={menu.key} className="flex items-center gap-3 cursor-pointer group">
                      <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${
                        formData.permissions.includes(menu.key)
                          ? 'bg-brand-primary border-brand-primary'
                          : 'border-gray-500 group-hover:border-white'
                      }`}>
                        {formData.permissions.includes(menu.key) && <Check size={14} className="text-white" />}
                      </div>
                      <span className="text-sm text-gray-300 group-hover:text-white transition-colors">{menu.label}</span>
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={formData.permissions.includes(menu.key)}
                        onChange={() => handleCheckboxChange(menu.key)}
                      />
                    </label>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-brand-primary text-white py-4 rounded-xl font-bold text-lg hover:bg-rose-700 transition"
              >
                {editingAdmin ? 'Simpan Perubahan Akses' : 'Simpan & Beri Akses'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

