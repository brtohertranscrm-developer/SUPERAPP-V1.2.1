import React, { useState, useEffect, useRef, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import {
  Shield, Plus, Trash2, X, Check, Pencil, Copy,
  Database, Download, Upload, AlertTriangle,
  RefreshCw, HardDrive, Users, Bike, CalendarCheck,
  Loader2, Clock, Search, ChevronDown, ChevronUp
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL?.trim() || '';

const availableMenus = [
  { key: 'dashboard', label: 'Dashboard Stats' },
  { key: 'booking',   label: 'Data Pesanan (Booking)' },
  { key: 'logistics', label: 'Jadwal Antar/Kembali (View)' },
  { key: 'logistics_manage', label: 'Jadwal Antar/Kembali (Manage)' },
  { key: 'manning',   label: 'Manning Tim (Karyawan & Libur)' },
  { key: 'finance',   label: 'Finance & Laporan Keuangan' },
  { key: 'armada',    label: 'Manajemen Armada & Unit' },
  { key: 'loker',     label: 'Manajemen Loker' },
  { key: 'pricing',   label: 'Dynamic Pricing & Promo' },
  { key: 'partners',  label: 'Partnership (Homepage Partner)' },
  { key: 'artikel',   label: 'Konten Artikel' },
  { key: 'users',     label: 'Data Pelanggan & KYC' },
  { key: 'settings',  label: 'Pengaturan & Akses' },
];

const permissionPresets = [
  {
    key: 'partner',
    label: 'Partner',
    permissions: ['partners'],
  },
  {
    key: 'staff_ops',
    label: 'Staff Operasional',
    permissions: ['logistics', 'manning'],
  },
  {
    key: 'finance',
    label: 'Finance',
    permissions: ['finance', 'settings'],
  },
  {
    key: 'konten',
    label: 'Konten',
    permissions: ['artikel', 'partners', 'pricing'],
  },
];

// ─── Section: Audit Logs ──────────────────────────────────────────────────────
const AuditLogsSection = ({ token }) => {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [limit, setLimit] = useState(50);
  const [isOpen, setIsOpen] = useState(false);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/audit-logs?limit=${limit}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setLogs(Array.isArray(data.data) ? data.data : []);
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, [limit]);

  const fmtDateTime = (d) => d
    ? new Date(d).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';

  const short = (s, n = 70) => {
    if (!s) return '—';
    const v = String(s);
    return v.length > n ? `${v.slice(0, n)}…` : v;
  };

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between gap-4 text-left"
      >
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Clock className="text-slate-700" size={18} /> Audit Logs (Aktivitas Admin)
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Logs dicatat otomatis untuk request non-GET ke endpoint admin. Buka hanya saat perlu audit atau troubleshooting.
          </p>
        </div>
        <div className="w-10 h-10 rounded-2xl border border-slate-200 flex items-center justify-center text-slate-600">
          {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </button>

      {isOpen && (
        <div className="mt-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs text-slate-500 font-medium">
              Menampilkan aktivitas admin terbaru untuk kebutuhan audit.
            </div>
            <div className="flex items-center gap-2">
              <select
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value, 10))}
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-slate-700 outline-none"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
              <button
                onClick={fetchLogs}
                className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-50 transition-colors"
                title="Refresh logs"
                disabled={isLoading}
              >
                <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="p-4 rounded-l-xl font-bold">Waktu</th>
                  <th className="p-4 font-bold">Admin</th>
                  <th className="p-4 font-bold">Action</th>
                  <th className="p-4 font-bold">Path</th>
                  <th className="p-4 font-bold text-center">Status</th>
                  <th className="p-4 rounded-r-xl font-bold">Context</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td className="p-5 text-slate-400 font-bold" colSpan={6}>
                      {isLoading ? 'Memuat audit logs...' : 'Belum ada log atau tidak ada akses.'}
                    </td>
                  </tr>
                ) : (
                  logs.map((l) => (
                    <tr key={l.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                      <td className="p-4 text-xs font-bold text-slate-700">{fmtDateTime(l.created_at)}</td>
                      <td className="p-4 text-xs text-slate-500 font-mono">{short(l.admin_id, 16)}</td>
                      <td className="p-4 text-xs font-black text-slate-800">{short(`${l.method} ${l.action}`, 28)}</td>
                      <td className="p-4 text-xs text-slate-600 font-mono">{short(l.path, 50)}</td>
                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black ${
                          Number(l.status_code) >= 400 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {l.status_code || '—'}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-slate-500 font-mono">{short(l.context, 70)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Section: Database Backup & Restore ──────────────────────────────────────
const DatabaseSection = ({ token }) => {
  const [dbInfo, setDbInfo]           = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreMsg, setRestoreMsg]   = useState('');
  const [restoreErr, setRestoreErr]   = useState('');
  const fileInputRef                  = useRef(null);

  const fetchDbInfo = async () => {
    try {
      const res  = await fetch(`${API_URL}/api/admin/database/info`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setDbInfo(data.data);
    } catch { /* silent */ }
  };

  useEffect(() => { fetchDbInfo(); }, []);

  // Export — trigger download langsung
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/database/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { alert('Gagal mengekspor database.'); return; }

      const blob     = await res.blob();
      const filename = res.headers.get('Content-Disposition')
        ?.split('filename=')[1]?.replace(/"/g, '')
        || 'brother_trans_backup.db';

      const url = URL.createObjectURL(blob);
      const a   = document.createElement('a');
      a.href    = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Terjadi kesalahan saat export.');
    } finally {
      setIsExporting(false);
    }
  };

  // Restore — upload file .db
  const handleRestore = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const confirm = window.confirm(
      '⚠️ PERHATIAN!\n\n' +
      'Proses restore akan MENGGANTI seluruh database saat ini dengan file yang kamu upload.\n\n' +
      'Backup otomatis akan dibuat sebelum restore.\n' +
      'Server akan restart otomatis setelah restore selesai.\n\n' +
      'Lanjutkan?'
    );
    if (!confirm) { e.target.value = ''; return; }

    setIsRestoring(true);
    setRestoreMsg('');
    setRestoreErr('');

    try {
      const formData = new FormData();
      formData.append('database', file);

      const res  = await fetch(`${API_URL}/api/admin/database/restore`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}` },
        body:    formData,
      });
      const data = await res.json();

      if (data.success) {
        setRestoreMsg(data.message);
        // Reload halaman setelah 4 detik (server restart)
        setTimeout(() => window.location.reload(), 4000);
      } else {
        setRestoreErr(data.error || 'Gagal merestore database.');
      }
    } catch {
      setRestoreErr('Terjadi kesalahan jaringan saat restore.');
    } finally {
      setIsRestoring(false);
      e.target.value = '';
    }
  };

  const fmtDate = (d) => d
    ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Database className="text-slate-700" size={20} /> Database Backup & Restore
        </h2>
        <button
          onClick={fetchDbInfo}
          className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-50 transition-colors"
          title="Refresh info"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Info DB */}
      {dbInfo && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { icon: HardDrive,    label: 'Ukuran DB',    value: dbInfo.size_mb + ' MB' },
            { icon: Users,        label: 'Total User',   value: dbInfo.users + ' akun' },
            { icon: CalendarCheck,label: 'Total Booking',value: dbInfo.bookings + ' order' },
            { icon: Bike,         label: 'Total Motor',  value: dbInfo.motors + ' unit' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <div className="flex items-center gap-2 mb-1">
                <Icon size={14} className="text-slate-400" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
              </div>
              <p className="font-black text-slate-900 text-sm">{value}</p>
            </div>
          ))}
        </div>
      )}

      {dbInfo?.modified && (
        <p className="text-xs text-slate-400 font-medium mb-6">
          Terakhir dimodifikasi: {fmtDate(dbInfo.modified)}
        </p>
      )}

      {/* Tombol Export & Import */}
      <div className="flex flex-col sm:flex-row gap-3">

        {/* Export */}
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 bg-slate-900 hover:bg-slate-700 disabled:opacity-50 text-white font-black rounded-2xl text-sm transition-colors"
        >
          {isExporting
            ? <><Loader2 size={16} className="animate-spin" /> Mengekspor...</>
            : <><Download size={16} /> Download Backup DB</>
          }
        </button>

        {/* Import/Restore */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isRestoring}
          className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-black rounded-2xl text-sm transition-colors"
        >
          {isRestoring
            ? <><Loader2 size={16} className="animate-spin" /> Merestore...</>
            : <><Upload size={16} /> Restore dari File .db</>
          }
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".db,.sqlite"
          className="hidden"
          onChange={handleRestore}
        />
      </div>

      {/* Status restore */}
      {restoreMsg && (
        <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
          <Check size={16} className="text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-black text-emerald-800">{restoreMsg}</p>
            <p className="text-xs text-emerald-600 mt-0.5">Halaman akan reload otomatis dalam beberapa detik...</p>
          </div>
        </div>
      )}
      {restoreErr && (
        <div className="mt-4 bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle size={16} className="text-rose-500 shrink-0 mt-0.5" />
          <p className="text-sm font-black text-rose-800">{restoreErr}</p>
        </div>
      )}

      {/* Warning */}
      <div className="mt-4 bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-start gap-3">
        <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700 font-medium leading-relaxed">
          <span className="font-black">Perhatian:</span> Restore akan mengganti seluruh data di server dengan file yang diupload.
          Backup otomatis dibuat sebelum restore. Pastikan file .db berasal dari backup Brothers Trans yang valid.
          Server akan restart otomatis setelah restore selesai.
        </p>
      </div>
    </div>
  );
};

// ─── Section: Motor Billing Settings (12 jam / 24 jam) ───────────────────────
const MotorBillingSection = ({ token }) => {
  const [settings, setSettings] = useState({
    motor_billing_mode: 'calendar',
    motor_threshold_12h: 12,
    updated_at: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [saveErr, setSaveErr] = useState('');

  const fetchSettings = async () => {
    setIsLoading(true);
    setSaveErr('');
    try {
      const res = await fetch(`${API_URL}/api/admin/settings/motor-billing`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data?.success && data?.data) {
        setSettings({
          motor_billing_mode: data.data.motor_billing_mode || 'calendar',
          motor_threshold_12h: Number(data.data.motor_threshold_12h) || 12,
          updated_at: data.data.updated_at || null,
        });
      } else {
        setSaveErr(data?.error || 'Gagal memuat pengaturan billing motor.');
      }
    } catch {
      setSaveErr('Gagal memuat pengaturan billing motor.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchSettings(); }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMsg('');
    setSaveErr('');
    try {
      const res = await fetch(`${API_URL}/api/admin/settings/motor-billing`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          motor_billing_mode: settings.motor_billing_mode,
          motor_threshold_12h: settings.motor_threshold_12h,
        }),
      });
      const data = await res.json();
      if (data?.success) {
        setSaveMsg(data.message || 'Tersimpan.');
        fetchSettings();
      } else {
        setSaveErr(data?.error || 'Gagal menyimpan pengaturan.');
      }
    } catch {
      setSaveErr('Gagal menyimpan pengaturan.');
    } finally {
      setIsSaving(false);
    }
  };

  const fmtDate = (d) => d
    ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';

  const mode = settings.motor_billing_mode;

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Clock className="text-slate-700" size={20} /> Aturan Billing Motor (12 Jam / 24 Jam)
        </h2>
        <button
          onClick={fetchSettings}
          className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-50 transition-colors"
          title="Refresh setting"
          disabled={isLoading}
        >
          <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Mode Hitung</div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSettings((s) => ({ ...s, motor_billing_mode: 'calendar' }))}
              className={`flex-1 px-4 py-3 rounded-xl font-black text-sm border transition-colors ${
                mode === 'calendar'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
              }`}
            >
              Per Kalender
            </button>
            <button
              type="button"
              onClick={() => setSettings((s) => ({ ...s, motor_billing_mode: 'stopwatch' }))}
              className={`flex-1 px-4 py-3 rounded-xl font-black text-sm border transition-colors ${
                mode === 'stopwatch'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
              }`}
            >
              Stopwatch (Durasi)
            </button>
          </div>

          <div className="mt-3 text-xs text-slate-600 font-medium leading-relaxed">
            {mode === 'calendar'
              ? 'Per Kalender: setiap tanggal dihitung terpisah (misal 23:00–23:59 tetap kena paket 12 jam pada tanggal itu).'
              : 'Stopwatch: dihitung dari selisih durasi total (misal 25 jam → 1×24 jam + 1×12 jam, tergantung threshold).'}
          </div>
        </div>

        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Threshold Paket 12 Jam</div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={1}
              max={23}
              value={settings.motor_threshold_12h}
              onChange={(e) => setSettings((s) => ({ ...s, motor_threshold_12h: parseInt(e.target.value, 10) || 12 }))}
              className="w-28 bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-brand-primary font-black text-slate-900"
            />
            <div className="text-xs text-slate-600 font-medium">
              Jika pemakaian &le; threshold jam, sistem akan pakai paket 12 jam.
            </div>
          </div>

          <div className="mt-3 text-[11px] text-slate-500 font-bold">
            Terakhir update: {fmtDate(settings.updated_at)}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || isLoading}
          className="px-5 py-3.5 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-black rounded-2xl text-sm transition-colors"
        >
          {isSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}
        </button>

        <div className="flex-1">
          {saveMsg && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-emerald-800 text-xs font-black">
              {saveMsg}
            </div>
          )}
          {saveErr && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 text-rose-800 text-xs font-black">
              {saveErr}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const AdminSettings = () => {
  const { token, user } = useContext(AuthContext);
  const [admins, setAdmins]           = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [roleFilter, setRoleFilter] = useState('all');
  const [adminSearch, setAdminSearch] = useState('');
  const [formData, setFormData]       = useState({
    name: '', email: '', phone: '', password: '', role: 'subadmin', permissions: [],
  });

  const fetchAdmins = async () => {
    try {
      const res  = await fetch(`${API_URL}/api/admin/admins`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setAdmins(data.data);
    } catch (err) { console.error(err); }
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
    setFormData(prev => {
      const isChecked = prev.permissions.includes(key);
      return {
        ...prev,
        permissions: isChecked
          ? prev.permissions.filter(p => p !== key)
          : [...prev.permissions, key],
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const endpoint = editingAdmin ? `${API_URL}/api/admin/admins/${editingAdmin.id}` : `${API_URL}/api/admin/admins`;
      const method = editingAdmin ? 'PUT' : 'POST';
      const payload = {
        ...formData,
        phone: formData.phone?.trim() || '-',
      };

      const res  = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify(payload),
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
    } catch { alert('Terjadi kesalahan sistem.'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Yakin ingin menghapus akun ini?')) return;
    try {
      const res  = await fetch(`${API_URL}/api/admin/admins/${id}`, {
        method:  'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) fetchAdmins();
      else alert(data.error);
    } catch (err) { console.error(err); }
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
    <div className="space-y-6">

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-brand-dark">Pengaturan Sistem</h1>
          <p className="text-gray-500 text-sm mt-1">Kelola hak akses, konfigurasi, dan backup database.</p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-brand-primary text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-rose-700 transition"
        >
          <Plus size={20} /> Tambah Admin
        </button>
      </div>

      {/* Section: Motor Billing */}
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
                      {adm.role.toUpperCase()}
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
                            return perms.map(p => (
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
                        >
                          <Pencil size={18} />
                        </button>
                      )}
                      {adm.role !== 'superadmin' && adm.role !== 'admin' && user?.id !== adm.id && (
                        <button onClick={() => handleDelete(adm.id)} className="text-red-400 hover:text-red-600 p-2" title="Hapus akun">
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

      {/* Section: Motor Billing */}
      <MotorBillingSection token={token} />

      {/* Section: Database */}
      <DatabaseSection token={token} />

      {/* Section: Audit Logs */}
      <AuditLogsSection token={token} />

      {/* Modal Tambah Admin */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white p-6 border-b border-gray-100 flex justify-between items-center z-10">
              <h3 className="font-black text-xl">{editingAdmin ? 'Edit Role & Hak Akses Admin' : 'Buat Akun Admin Baru'}</h3>
              <button onClick={() => { setIsModalOpen(false); resetAdminForm(); }} className="text-gray-400 hover:text-red-500"><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Nama Lengkap</label>
                  <input type="text" required value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-brand-primary"
                    placeholder="Cth: Vendor Artikel" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Email Login</label>
                  <input type="email" required value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-brand-primary"
                    placeholder="vendor@brother.com" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Nomor HP</label>
                <input type="text" value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-brand-primary"
                  placeholder="Opsional, untuk kontak internal" />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  {editingAdmin ? 'Password Baru (opsional)' : 'Password Login'}
                </label>
                <input type="password" required={!editingAdmin} value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-brand-primary"
                  placeholder={editingAdmin ? 'Kosongkan jika tidak ingin mengubah password' : 'Minimal 6 karakter'} />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Role Akun</label>
                <select
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value })}
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
                  {availableMenus.map(menu => (
                    <label key={menu.key} className="flex items-center gap-3 cursor-pointer group">
                      <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${
                        formData.permissions.includes(menu.key)
                          ? 'bg-brand-primary border-brand-primary'
                          : 'border-gray-500 group-hover:border-white'
                      }`}>
                        {formData.permissions.includes(menu.key) && <Check size={14} className="text-white" />}
                      </div>
                      <span className="text-sm text-gray-300 group-hover:text-white transition-colors">{menu.label}</span>
                      <input type="checkbox" className="hidden"
                        checked={formData.permissions.includes(menu.key)}
                        onChange={() => handleCheckboxChange(menu.key)} />
                    </label>
                  ))}
                </div>
              </div>

              <button type="submit" className="w-full bg-brand-primary text-white py-4 rounded-xl font-bold text-lg hover:bg-rose-700 transition">
                {editingAdmin ? 'Simpan Perubahan Akses' : 'Simpan & Beri Akses'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminSettings;
