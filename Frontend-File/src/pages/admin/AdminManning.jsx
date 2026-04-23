import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCw, Loader2, Pencil, Trash2, Users, Calendar, MapPin } from 'lucide-react';
import { apiFetch } from '../../utils/api';
import { AuthContext } from '../../context/AuthContext';

const todayYmd = () => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

const LOCATIONS = ['Semua', 'Yogyakarta', 'Solo', 'Semarang', 'Nasional'];

const STATUS_OPTIONS = [
  { value: 'on',    label: 'ON DUTY', cls: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  { value: 'off',   label: 'LIBUR',   cls: 'bg-slate-50 text-slate-700 border-slate-100' },
  { value: 'leave', label: 'CUTI',    cls: 'bg-amber-50 text-amber-700 border-amber-100' },
  { value: 'sick',  label: 'SAKIT',   cls: 'bg-rose-50 text-rose-700 border-rose-100' },
];

const parsePerms = (user) => {
  try {
    if (typeof user?.permissions === 'string') {
      const parsed = JSON.parse(user.permissions);
      return Array.isArray(parsed) ? parsed : [];
    }
    if (Array.isArray(user?.permissions)) return user.permissions;
    return [];
  } catch {
    return [];
  }
};

const StatusPill = ({ value }) => {
  const opt = STATUS_OPTIONS.find((o) => o.value === value) || STATUS_OPTIONS[0];
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-widest border ${opt.cls}`}>
      {opt.label}
    </span>
  );
};

const EmployeeModal = ({ initial, onClose, onSaved }) => {
  const isEdit = !!initial?.id;
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: initial?.name || '',
    phone: initial?.phone || '',
    email: initial?.email || '',
    base_location: initial?.base_location || 'Yogyakarta',
    role_tag: initial?.role_tag || 'delivery',
    is_active: initial?.is_active === 0 ? 0 : 1,
  });

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name?.trim(),
        phone: form.phone?.trim() || null,
        email: form.email?.trim() || null,
        base_location: form.base_location,
        role_tag: form.role_tag?.trim() || 'delivery',
        is_active: form.is_active ? 1 : 0,
      };

      if (!payload.name) throw new Error('Nama wajib diisi.');

      if (isEdit) {
        await apiFetch(`/api/admin/manning/employees/${initial.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch('/api/admin/manning/employees', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      onSaved?.();
      onClose?.();
    } catch (err) {
      alert(err?.message || 'Gagal menyimpan karyawan.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-0 md:p-6">
      <div className="bg-white w-full md:max-w-xl rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden">
        <div className="p-5 border-b flex items-center justify-between">
          <div className="font-black text-lg">{isEdit ? 'Edit Karyawan' : 'Tambah Karyawan'}</div>
          <button onClick={onClose} className="text-slate-500 hover:text-rose-600 font-black text-xl">×</button>
        </div>

        <form onSubmit={save} className="p-5 space-y-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Nama</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full border rounded-2xl px-4 py-3 font-bold outline-none focus:ring-2 focus:ring-brand-primary"
              placeholder="Mis: Dimas (Delivery)"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">No WA</label>
              <input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="w-full border rounded-2xl px-4 py-3 font-bold outline-none focus:ring-2 focus:ring-brand-primary"
                placeholder="08xxxx"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Email</label>
              <input
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full border rounded-2xl px-4 py-3 font-bold outline-none focus:ring-2 focus:ring-brand-primary"
                placeholder="ops@brothertrans.id"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Base Location</label>
              <select
                value={form.base_location}
                onChange={(e) => setForm((f) => ({ ...f, base_location: e.target.value }))}
                className="w-full border rounded-2xl px-4 py-3 font-black outline-none bg-white"
              >
                {LOCATIONS.filter((l) => l !== 'Semua').map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Role Tag</label>
              <select
                value={form.role_tag}
                onChange={(e) => setForm((f) => ({ ...f, role_tag: e.target.value }))}
                className="w-full border rounded-2xl px-4 py-3 font-black outline-none bg-white"
              >
                <option value="delivery">delivery</option>
                <option value="return">return</option>
                <option value="ops">ops</option>
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
            <input
              type="checkbox"
              checked={!!form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked ? 1 : 0 }))}
            />
            Aktif
          </label>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-2xl font-black text-slate-600 hover:bg-slate-50"
              disabled={saving}
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-2xl font-black bg-brand-primary text-white hover:opacity-95 disabled:opacity-60 inline-flex items-center gap-2"
              disabled={saving}
            >
              {saving ? <Loader2 className="animate-spin" size={16} /> : null}
              Simpan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function AdminManning() {
  const { user } = useContext(AuthContext) || {};
  const isSuperAdmin = user?.role === 'superadmin' || user?.role === 'admin';
  const perms = useMemo(() => parsePerms(user), [user]);
  const canManage = isSuperAdmin || perms.includes('manning');

  const [selectedDate, setSelectedDate] = useState(todayYmd());
  const [location, setLocation] = useState('Semua');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [rows, setRows] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editEmp, setEditEmp] = useState(null);

  const [savingMap, setSavingMap] = useState({});

  const fetchDay = async () => {
    setIsLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams({
        date: selectedDate,
        ...(location !== 'Semua' ? { location } : {}),
      }).toString();
      const data = await apiFetch(`/api/admin/manning/availability/day?${qs}`);
      setRows(Array.isArray(data?.data) ? data.data : []);
    } catch (err) {
      setRows([]);
      setError(err?.message || 'Gagal memuat data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!canManage) return;
    fetchDay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, location, canManage]);

  const saveAvailability = async ({ employee_id, status, note }) => {
    setSavingMap((m) => ({ ...m, [employee_id]: true }));
    try {
      await apiFetch('/api/admin/manning/availability', {
        method: 'POST',
        body: JSON.stringify({
          employee_id,
          date: selectedDate,
          status,
          note: note || null,
        }),
      });
    } catch (err) {
      alert(err?.message || 'Gagal menyimpan status.');
    } finally {
      setSavingMap((m) => ({ ...m, [employee_id]: false }));
    }
  };

  const handleDeactivate = async (emp) => {
    if (!window.confirm(`Nonaktifkan ${emp?.name || 'karyawan'}?`)) return;
    try {
      await apiFetch(`/api/admin/manning/employees/${emp.id}`, { method: 'DELETE' });
      fetchDay();
    } catch (err) {
      alert(err?.message || 'Gagal menonaktifkan.');
    }
  };

  if (!canManage) {
    return (
      <div className="p-6">
        <div className="bg-white border border-slate-100 rounded-3xl p-6">
          <div className="font-black text-lg mb-2">Tidak ada akses</div>
          <div className="text-sm text-slate-500 font-medium">
            Butuh permission <span className="font-mono font-bold">manning</span> untuk mengelola data karyawan.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start md:items-center justify-between gap-3 flex-col md:flex-row">
        <div>
          <div className="text-2xl font-black tracking-tight flex items-center gap-2">
            <Users className="text-slate-900" size={22} /> Manning Tim (Karyawan)
          </div>
          <div className="text-sm text-slate-500 font-medium mt-1">
            Set siapa <span className="font-black">ON DUTY</span> dan siapa <span className="font-black">LIBUR/CUTI/SAKIT</span> per tanggal.
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => { setEditEmp(null); setModalOpen(true); }}
            className="px-4 py-2 rounded-2xl font-black bg-brand-primary text-white hover:opacity-95 inline-flex items-center gap-2"
          >
            <Plus size={16} /> Tambah
          </button>
          <button
            onClick={fetchDay}
            className="px-4 py-2 rounded-2xl font-black bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 inline-flex items-center gap-2"
            disabled={isLoading}
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-3xl p-5 flex flex-col md:flex-row gap-3 md:items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-slate-500" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border rounded-2xl px-4 py-2 font-black text-slate-700 outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <MapPin size={16} className="text-slate-500" />
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="border rounded-2xl px-4 py-2 font-black text-slate-700 outline-none bg-white"
          >
            {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <div className="font-black text-slate-900">Status Tim ({rows.length})</div>
          <div className="text-xs text-slate-500 font-bold">
            Default jika kosong: <span className="font-black">ON DUTY</span>
          </div>
        </div>

        {error ? (
          <div className="p-5 text-rose-600 font-bold">{error}</div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="p-4 font-black">Nama</th>
                <th className="p-4 font-black">Lokasi</th>
                <th className="p-4 font-black">Kontak</th>
                <th className="p-4 font-black">Status</th>
                <th className="p-4 font-black">Catatan</th>
                <th className="p-4 font-black text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="p-5 text-slate-400 font-bold" colSpan={6}>
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="animate-spin" size={16} /> Memuat...
                    </span>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td className="p-5 text-slate-400 font-bold" colSpan={6}>
                    Belum ada data. Tambahkan karyawan dulu.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                    <td className="p-4">
                      <div className="font-black text-slate-900">{r.name}</div>
                      <div className="text-[11px] text-slate-500 font-bold">{r.role_tag || 'delivery'}</div>
                    </td>
                    <td className="p-4">
                      <span className="px-3 py-1 rounded-full text-[10px] font-black bg-slate-100 text-slate-700">
                        {r.base_location || '—'}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-slate-600 font-bold">
                      <div>{r.phone || '—'}</div>
                      <div className="text-slate-400 font-medium">{r.email || ''}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <select
                          value={r.status || 'on'}
                          onChange={(e) => {
                            const v = e.target.value;
                            setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, status: v } : x)));
                            saveAvailability({ employee_id: r.id, status: v, note: r.note });
                          }}
                          className="border rounded-2xl px-3 py-2 font-black text-xs bg-white outline-none"
                          disabled={!!savingMap[r.id]}
                        >
                          {STATUS_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                        <StatusPill value={r.status || 'on'} />
                        {savingMap[r.id] ? <Loader2 className="animate-spin text-slate-400" size={14} /> : null}
                      </div>
                    </td>
                    <td className="p-4">
                      <input
                        value={r.note || ''}
                        onChange={(e) => {
                          const v = e.target.value;
                          setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, note: v } : x)));
                        }}
                        onBlur={() => saveAvailability({ employee_id: r.id, status: r.status || 'on', note: r.note })}
                        className="w-full border rounded-2xl px-3 py-2 text-xs font-bold outline-none"
                        placeholder="Opsional: alasan/catatan"
                        disabled={!!savingMap[r.id]}
                      />
                    </td>
                    <td className="p-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => { setEditEmp(r); setModalOpen(true); }}
                          className="p-2 rounded-xl hover:bg-slate-100 text-slate-600"
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDeactivate(r)}
                          className="p-2 rounded-xl hover:bg-rose-50 text-rose-600"
                          title="Nonaktifkan"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen ? (
        <EmployeeModal
          initial={editEmp}
          onClose={() => { setModalOpen(false); setEditEmp(null); }}
          onSaved={fetchDay}
        />
      ) : null}
    </div>
  );
}

