import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, RefreshCw, CheckCircle2, X, MapPin, Clock, User, Phone, ClipboardCheck, Pencil, Trash2, Users } from 'lucide-react';
import { apiFetch } from '../../utils/api';
import { AuthContext } from '../../context/AuthContext';

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

const StatusBadge = ({ status }) => {
  const s = String(status || '').toLowerCase();
  const cls =
    s === 'completed'
      ? 'bg-emerald-100 text-emerald-700'
      : s === 'cancelled'
        ? 'bg-rose-100 text-rose-700'
        : 'bg-amber-100 text-amber-700';
  const label =
    s === 'completed' ? 'SELESAI'
      : s === 'cancelled' ? 'BATAL'
        : 'TERJADWAL';

  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest ${cls}`}>
      {label}
    </span>
  );
};

const fmtDateTime = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const formatRupiah = (value) => {
  const n = Number(value) || 0;
  try {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
  } catch {
    return `Rp ${n.toLocaleString('id-ID')}`;
  }
};

const fmtDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('id-ID', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
};

const todayYmd = () => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

const shiftYmd = (ymd, deltaDays) => {
  const d = new Date(`${ymd}T00:00`);
  d.setDate(d.getDate() + deltaDays);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const TEAM_LOCATIONS = ['Semua', 'Yogyakarta', 'Solo', 'Semarang', 'Nasional'];

const TeamStatusBadge = ({ status }) => {
  const s = String(status || 'on').toLowerCase();
  const cls =
    s === 'on'
      ? 'bg-emerald-100 text-emerald-700'
      : s === 'off'
        ? 'bg-slate-100 text-slate-700'
        : s === 'leave'
          ? 'bg-amber-100 text-amber-700'
          : 'bg-rose-100 text-rose-700';
  const label =
    s === 'on' ? 'ON'
      : s === 'off' ? 'LIBUR'
        : s === 'leave' ? 'CUTI'
          : 'SAKIT';

  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-widest ${cls}`}>
      {label}
    </span>
  );
};

export default function AdminLogistics() {
  const { user } = useContext(AuthContext) || {};
  const isSuperAdmin = user?.role === 'superadmin' || user?.role === 'admin';
  const perms = useMemo(() => parsePerms(user), [user]);
  const canManage = isSuperAdmin || perms.includes('logistics_manage');

  const tabs = useMemo(() => ([
    { key: 'delivery', label: 'Pengantaran Unit' },
    { key: 'return', label: 'Pengembalian Unit' },
  ]), []);

  const [activeTab, setActiveTab] = useState('delivery');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [tasks, setTasks] = useState([]);
  const [selectedDate, setSelectedDate] = useState(todayYmd());
  const [showAllDates, setShowAllDates] = useState(false);

  // Team Today (Manning)
  const [teamLoc, setTeamLoc] = useState('Semua');
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamData, setTeamData] = useState([]);
  const [teamCounts, setTeamCounts] = useState(null);

  const [selected, setSelected] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    order_id: '',
    motor_type: '',
    customer_name: '',
    customer_phone: '',
    location_text: '',
    scheduled_at: '',
    assigned_to_name: '',
    notes: '',
  });

  const fetchTasks = async () => {
    setIsLoading(true);
    setError('');
    try {
      const base = `/api/admin/logistics/tasks?task_type=${activeTab}`;
      const qs = showAllDates
        ? ''
        : `&from=${encodeURIComponent(`${selectedDate}T00:00`)}&to=${encodeURIComponent(`${selectedDate}T23:59`)}`;
      const data = await apiFetch(`${base}${qs}`);
      setTasks(Array.isArray(data?.data) ? data.data : []);
    } catch (err) {
      setError(err?.message || 'Gagal memuat data.');
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTeam = async () => {
    setTeamLoading(true);
    try {
      const qs = new URLSearchParams({
        date: selectedDate,
        ...(teamLoc !== 'Semua' ? { location: teamLoc } : {}),
      }).toString();
      const data = await apiFetch(`/api/admin/manning/today?${qs}`);
      setTeamData(Array.isArray(data?.data) ? data.data : []);
      setTeamCounts(data?.counts || null);
    } catch {
      setTeamData([]);
      setTeamCounts(null);
    } finally {
      setTeamLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedDate, showAllDates]);

  useEffect(() => {
    fetchTeam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, teamLoc]);

  const openDetail = async (task) => {
    setIsDetailOpen(true);
    setSelected(task);
    setDetailLoading(true);
    try {
      const data = await apiFetch(`/api/admin/logistics/tasks/${task.id}`);
      setSelected(data?.data || task);
    } catch {
      // fallback to list item
    } finally {
      setDetailLoading(false);
    }
  };

  const handleComplete = async (taskId) => {
    if (!window.confirm('Tandai tugas ini sebagai SELESAI?')) return;
    try {
      await apiFetch(`/api/admin/logistics/tasks/${taskId}/complete`, { method: 'PATCH' });
      await fetchTasks();
      if (selected?.id === taskId) {
        const detail = await apiFetch(`/api/admin/logistics/tasks/${taskId}`);
        setSelected(detail?.data || null);
      }
    } catch (err) {
      alert(err?.message || 'Gagal checklist.');
    }
  };

  const resetForm = () => setForm({
    order_id: '',
    motor_type: '',
    customer_name: '',
    customer_phone: '',
    location_text: '',
    scheduled_at: '',
    assigned_to_name: '',
    notes: '',
  });

  const openCreate = () => {
    setEditId(null);
    resetForm();
    setIsCreateOpen(true);
  };

  const toDatetimeLocal = (value) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const openEdit = async (task, { preferDetail = true } = {}) => {
    if (!canManage) return;
    setEditId(task?.id || null);
    resetForm();
    setIsCreateOpen(true);

    if (!preferDetail) {
      setForm({
        order_id: task?.order_id || '',
        motor_type: task?.motor_type || '',
        customer_name: task?.customer_name || '',
        customer_phone: task?.customer_phone || '',
        location_text: task?.location_text || '',
        scheduled_at: toDatetimeLocal(task?.scheduled_at),
        assigned_to_name: task?.assigned_to_name || '',
        notes: task?.notes || '',
      });
      return;
    }

    try {
      const data = await apiFetch(`/api/admin/logistics/tasks/${task.id}`);
      const t = data?.data || task;
      setForm({
        order_id: t?.order_id || '',
        motor_type: t?.motor_type || '',
        customer_name: t?.customer_name || '',
        customer_phone: t?.customer_phone || '',
        location_text: t?.location_text || '',
        scheduled_at: toDatetimeLocal(t?.scheduled_at),
        assigned_to_name: t?.assigned_to_name || '',
        notes: t?.notes || '',
      });
    } catch {
      setForm({
        order_id: task?.order_id || '',
        motor_type: task?.motor_type || '',
        customer_name: task?.customer_name || '',
        customer_phone: task?.customer_phone || '',
        location_text: task?.location_text || '',
        scheduled_at: toDatetimeLocal(task?.scheduled_at),
        assigned_to_name: task?.assigned_to_name || '',
        notes: task?.notes || '',
      });
    }
  };

  const handleDelete = async (taskId) => {
    if (!canManage) return;
    if (!window.confirm('Hapus jadwal ini? (Tidak bisa dibatalkan)')) return;
    try {
      await apiFetch(`/api/admin/logistics/tasks/${taskId}`, { method: 'DELETE' });
      if (selected?.id === taskId) setIsDetailOpen(false);
      await fetchTasks();
    } catch (err) {
      alert(err?.message || 'Gagal menghapus.');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    try {
      const payload = {
        task_type: activeTab,
        order_id: form.order_id?.trim() || undefined,
        motor_type: form.motor_type?.trim() || undefined,
        customer_name: form.customer_name?.trim() || undefined,
        customer_phone: form.customer_phone?.trim() || undefined,
        location_text: form.location_text?.trim() || undefined,
        scheduled_at: form.scheduled_at || undefined,
        assigned_to_name: form.assigned_to_name?.trim() || undefined,
        notes: form.notes?.trim() || undefined,
      };

      if (editId) {
        await apiFetch(`/api/admin/logistics/tasks/${editId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch('/api/admin/logistics/tasks', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      // Kalau user membuat jadwal di tanggal berbeda dari filter aktif,
      // otomatis pindahkan filter ke tanggal jadwal agar item langsung terlihat.
      const ymd = form.scheduled_at ? String(form.scheduled_at).slice(0, 10) : '';
      if (ymd && /^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
        setShowAllDates(false);
        setSelectedDate(ymd);
      }

      setIsCreateOpen(false);
      setEditId(null);
      resetForm();
      await fetchTasks();
    } catch (err) {
      alert(err?.message || 'Gagal membuat jadwal.');
    } finally {
      setCreateLoading(false);
    }
  };

  const title = activeTab === 'delivery' ? 'Kelola Jadwal Pengantaran' : 'Kelola Jadwal Pengembalian';
  const headerDateText = showAllDates ? 'Semua Tanggal' : fmtDate(`${selectedDate}T00:00`);

  const summary = useMemo(() => {
    const out = { scheduled: 0, completed: 0, cancelled: 0 };
    for (const t of tasks) {
      const s = String(t?.status || '').toLowerCase();
      if (s === 'completed') out.completed += 1;
      else if (s === 'cancelled') out.cancelled += 1;
      else out.scheduled += 1;
    }
    return out;
  }, [tasks]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-brand-dark">{title}</h1>
          <p className="text-gray-500 text-sm mt-1">
            Halaman ini untuk melihat semua jadwal, membuka detail tugas, membuat jadwal baru, dan mengatur pekerjaan tim.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="bg-white border border-gray-200 rounded-2xl px-4 py-2 flex items-center gap-2">
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Hari</div>
            <button
              type="button"
              onClick={() => { setShowAllDates(false); setSelectedDate((d) => shiftYmd(d, -1)); }}
              className="px-2 py-1 rounded-lg font-black text-gray-700 hover:bg-gray-50 border border-transparent hover:border-gray-200"
              title="Hari sebelumnya"
            >
              ‹
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => { setShowAllDates(false); setSelectedDate(e.target.value); }}
              className="text-sm font-black text-gray-900 bg-transparent outline-none"
              disabled={showAllDates}
            />
            <button
              type="button"
              onClick={() => { setShowAllDates(false); setSelectedDate((d) => shiftYmd(d, 1)); }}
              className="px-2 py-1 rounded-lg font-black text-gray-700 hover:bg-gray-50 border border-transparent hover:border-gray-200"
              title="Hari berikutnya"
            >
              ›
            </button>
            <button
              type="button"
              onClick={() => { setShowAllDates(false); setSelectedDate(todayYmd()); }}
              className="ml-1 px-3 py-1 rounded-xl font-black text-xs bg-gray-100 text-gray-700 hover:bg-gray-200"
              title="Hari ini"
            >
              Hari ini
            </button>
          </div>

          <label className="bg-white border border-gray-200 rounded-2xl px-4 py-2 flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showAllDates}
              onChange={(e) => setShowAllDates(e.target.checked)}
              className="h-4 w-4"
            />
            <span className="text-sm font-black text-gray-700">Semua</span>
          </label>

          <button
            onClick={fetchTasks}
            className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-50"
            title="Refresh"
          >
            <RefreshCw size={18} /> Refresh
          </button>
          {canManage && (
            <button
              onClick={openCreate}
              className="bg-brand-primary text-white px-4 py-2 rounded-xl font-black flex items-center gap-2 hover:bg-rose-700 transition"
            >
              <Plus size={18} /> Buat Jadwal
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="font-black text-gray-900">
          Tanggal: <span className="text-brand-primary">{headerDateText}</span>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-black">
          <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800">Terjadwal: {summary.scheduled}</span>
          <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800">Selesai: {summary.completed}</span>
          <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-800">Batal: {summary.cancelled}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-3xl border border-indigo-100 bg-indigo-50 p-5">
          <div className="text-[10px] font-black uppercase tracking-widest text-indigo-700/70">Halaman Ini Untuk</div>
          <div className="mt-2 text-lg font-black text-indigo-900">Kelola semua jadwal operasional</div>
          <p className="mt-2 text-sm font-medium text-indigo-900/75">
            Cocok untuk admin operasional atau supervisor yang perlu buat jadwal, edit detail tugas, dan cek seluruh antrean pekerjaan.
          </p>
        </div>
        <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5">
          <div className="text-[10px] font-black uppercase tracking-widest text-emerald-700/70">Untuk Staf Lapangan</div>
          <div className="mt-2 text-lg font-black text-emerald-900">Lebih mudah mulai dari menu “Tugas Hari Ini”</div>
          <p className="mt-2 text-sm font-medium text-emerald-900/75">
            Di sana tugas ditampilkan lebih ringkas dan langsung ada tombol hubungi customer serta checklist selesai.
          </p>
        </div>
      </div>

      {/* Team Today (Manning) */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-gray-700" />
            <div>
              <div className="font-black text-gray-900">Tim Hari Ini</div>
              <div className="text-[11px] text-gray-500 font-bold">
                {selectedDate}
                {teamCounts ? ` • Total ${teamCounts.total} (ON ${teamCounts.on}, OFF ${teamCounts.off}, CUTI ${teamCounts.leave}, SAKIT ${teamCounts.sick})` : ''}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <select
              value={teamLoc}
              onChange={(e) => setTeamLoc(e.target.value)}
              className="bg-white border border-gray-200 rounded-2xl px-4 py-2 font-black text-sm text-gray-800 outline-none"
              title="Filter lokasi"
            >
              {TEAM_LOCATIONS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
            <button
              onClick={fetchTeam}
              className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-50"
              title="Refresh tim"
              disabled={teamLoading}
            >
              <RefreshCw size={18} className={teamLoading ? 'animate-spin' : ''} /> Refresh Tim
            </button>
          </div>
        </div>

        <div className="mt-4">
          {teamLoading ? (
            <div className="flex items-center gap-2 text-gray-400 font-bold">
              <Loader2 className="animate-spin" size={16} /> Memuat tim...
            </div>
          ) : teamData.length === 0 ? (
            <div className="text-sm text-gray-500 font-medium">
              Belum ada data tim (atau akun ini belum punya akses manning).
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {teamData.map((m) => (
                <div key={m.id} className="bg-gray-50 border border-gray-100 rounded-3xl p-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-black text-gray-900 truncate" title={m.name}>{m.name}</div>
                    <div className="text-xs text-gray-500 font-bold mt-1 truncate" title={`${m.base_location || ''} • ${m.role_tag || ''}`}>
                      {m.base_location || '—'} • {m.role_tag || 'delivery'}
                    </div>
                    {m.note ? (
                      <div className="text-xs text-gray-500 font-medium mt-2 line-clamp-2">
                        Catatan: {m.note}
                      </div>
                    ) : null}
                  </div>
                  <TeamStatusBadge status={m.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-3xl p-2 shadow-sm border border-gray-100 flex gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex-1 px-4 py-3 rounded-2xl font-black text-sm transition ${
              activeTab === t.key ? 'bg-brand-dark text-white' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        {isLoading ? (
          <div className="flex h-56 flex-col items-center justify-center text-rose-500">
            <Loader2 className="animate-spin mb-3" size={42} />
            <div className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Memuat jadwal...</div>
          </div>
        ) : error ? (
          <div className="p-4 bg-rose-50 text-rose-700 rounded-2xl font-bold text-sm">{error}</div>
        ) : tasks.length === 0 ? (
          <div className="p-10 text-center text-gray-400 font-bold">Belum ada jadwal.</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {tasks.map((t) => (
              <div
                key={t.id}
                role="button"
                tabIndex={0}
                onClick={() => openDetail(t)}
                onKeyDown={(e) => { if (e.key === 'Enter') openDetail(t); }}
                className="text-left bg-gray-50 border border-gray-100 rounded-3xl p-5 hover:bg-white hover:border-gray-200 transition shadow-sm cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm text-gray-500 font-extrabold uppercase tracking-widest">Jenis Motor</div>
                    <div className="text-lg font-black text-gray-900">{t.motor_type || '—'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={t.status} />
                    {canManage && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); openEdit(t, { preferDetail: false }); }}
                          className="p-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:text-brand-primary hover:border-brand-primary"
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}
                          className="p-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:text-rose-600 hover:border-rose-300"
                          title="Hapus"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-gray-700">
                    <User size={16} className="text-brand-primary" />
                    <span className="font-bold">{t.customer_name || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <MapPin size={16} className="text-brand-primary" />
                    <span className="font-bold truncate" title={t.location_text || ''}>{t.location_text || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <Clock size={16} className="text-brand-primary" />
                    <span className="font-bold">{fmtDateTime(t.scheduled_at)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <ClipboardCheck size={16} className="text-brand-primary" />
                    <span className="font-bold">{t.assigned_to_name || '—'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {isDetailOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white p-6 border-b border-gray-100 flex justify-between items-center z-10">
              <div>
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Detail Tugas</div>
                <div className="font-black text-xl">#{selected?.id || '—'} <span className="text-gray-400">•</span> {title}</div>
              </div>
              <button onClick={() => setIsDetailOpen(false)} className="text-gray-400 hover:text-red-500">
                <X size={24} />
              </button>
            </div>

            {detailLoading ? (
              <div className="flex h-56 flex-col items-center justify-center text-rose-500">
                <Loader2 className="animate-spin mb-3" size={42} />
                <div className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Memuat detail...</div>
              </div>
            ) : (
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <StatusBadge status={selected?.status} />
                  <div className="text-[11px] text-gray-400 font-bold">
                    Dibuat: {fmtDateTime(selected?.created_at)} {selected?.created_by_name ? `oleh ${selected.created_by_name}` : ''}
                  </div>
                </div>

                {canManage && (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(selected, { preferDetail: true })}
                      className="flex-1 bg-white border border-gray-200 text-gray-700 py-3 rounded-2xl font-black hover:bg-gray-50 flex items-center justify-center gap-2"
                    >
                      <Pencil size={18} /> Edit Jadwal
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(selected.id)}
                      className="flex-1 bg-rose-600 text-white py-3 rounded-2xl font-black hover:bg-rose-700 flex items-center justify-center gap-2"
                    >
                      <Trash2 size={18} /> Hapus Jadwal
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Jenis Motor</div>
                    <div className="font-black text-gray-900">{selected?.booking?.item_name || selected?.motor_type || '—'}</div>
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Order ID</div>
                    <div className="font-black text-gray-900">{selected?.booking?.order_id || selected?.order_id || '—'}</div>
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Pelanggan</div>
                    <div className="font-black text-gray-900">{selected?.booking?.user_name || selected?.customer_name || '—'}</div>
                    <div className="mt-2 flex items-center gap-2 text-gray-700 text-sm font-bold">
                      <Phone size={16} className="text-brand-primary" />
                      {selected?.booking?.user_phone || selected?.customer_phone || '—'}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Jadwal</div>
                    <div className="font-black text-gray-900">{fmtDateTime(selected?.scheduled_at)}</div>
                    <div className="mt-2 flex items-center gap-2 text-gray-700 text-sm font-bold">
                      <MapPin size={16} className="text-brand-primary" />
                      <span className="truncate" title={selected?.booking?.delivery_address || selected?.location_text || ''}>
                        {selected?.booking?.delivery_address || selected?.location_text || '—'}
                      </span>
                    </div>
                  </div>
                </div>

                {(selected?.gear_summary || selected?.addons?.length) && (
                  <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Perlengkapan</div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="bg-white rounded-2xl border border-gray-100 p-4">
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Helm</div>
                        <div className="mt-1 text-xl font-black text-gray-900">{selected?.gear_summary?.helm ?? '—'}</div>
                      </div>
                      <div className="bg-white rounded-2xl border border-gray-100 p-4">
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Jas Hujan</div>
                        <div className="mt-1 text-xl font-black text-gray-900">{selected?.gear_summary?.jas_hujan ?? '—'}</div>
                      </div>
                      <div className="bg-white rounded-2xl border border-gray-100 p-4">
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Helm Anak</div>
                        <div className="mt-1 text-xl font-black text-gray-900">{selected?.gear_summary?.helm_anak ?? '—'}</div>
                      </div>
                    </div>
                  </div>
                )}

                {selected?.booking && (
                  <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Tagihan</div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="bg-white rounded-2xl border border-gray-100 p-4">
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total</div>
                        <div className="mt-1 text-lg font-black text-gray-900">{formatRupiah(selected.booking.total_price)}</div>
                      </div>
                      <div className="bg-white rounded-2xl border border-gray-100 p-4">
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">DP / Sudah Bayar</div>
                        <div className="mt-1 text-lg font-black text-gray-900">{formatRupiah(selected.booking.paid_amount)}</div>
                      </div>
                      <div className="bg-white rounded-2xl border border-gray-100 p-4">
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Kekurangan</div>
                        <div className="mt-1 text-lg font-black text-rose-600">{formatRupiah(selected.booking.outstanding_amount)}</div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">PIC Pengantar</div>
                  <div className="font-black text-gray-900">{selected?.assigned_to_name || '—'}</div>
                </div>

                {(selected?.notes || selected?.booking?.price_notes) && (
                  <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Catatan</div>
                    <div className="text-gray-800 font-semibold whitespace-pre-wrap">
                      {selected?.notes || selected?.booking?.price_notes}
                    </div>
                  </div>
                )}

                {selected?.status === 'completed' && (
                  <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
                    <div className="flex items-center gap-2 font-black text-emerald-800">
                      <CheckCircle2 size={18} /> Sudah selesai
                    </div>
                    <div className="text-sm text-emerald-700 font-bold mt-2">
                      Waktu: {fmtDateTime(selected?.completed_at)}{selected?.completed_by_name ? ` • Oleh: ${selected.completed_by_name}` : ''}
                    </div>
                  </div>
                )}

                {selected?.status !== 'completed' && selected?.status !== 'cancelled' && (
                  <button
                    onClick={() => handleComplete(selected.id)}
                    className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-emerald-700 transition flex items-center justify-center gap-2"
                  >
                    <ClipboardCheck size={20} /> Checklist: Tugas Selesai
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white p-6 border-b border-gray-100 flex justify-between items-center z-10">
              <div>
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Buat Jadwal</div>
                <div className="font-black text-xl">{editId ? 'Edit Jadwal' : title}</div>
              </div>
              <button onClick={() => { setIsCreateOpen(false); setEditId(null); }} className="text-gray-400 hover:text-red-500">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-5">
              <div className="bg-brand-dark rounded-2xl p-4 text-white text-sm font-semibold">
                Tips: Isi <span className="font-black">Order ID</span> untuk auto-isi (jika data booking ada). Kalau manual, isi field lainnya.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Order ID (opsional)</label>
                  <input
                    value={form.order_id}
                    onChange={(e) => setForm((p) => ({ ...p, order_id: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-brand-primary"
                    placeholder="Cth: ORD-2026-0001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Tanggal & Jam</label>
                  <input
                    type="datetime-local"
                    required
                    value={form.scheduled_at}
                    onChange={(e) => setForm((p) => ({ ...p, scheduled_at: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-brand-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Jenis Motor</label>
                  <input
                    value={form.motor_type}
                    onChange={(e) => setForm((p) => ({ ...p, motor_type: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-brand-primary"
                    placeholder="Cth: Scoopy / Vario 160"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Nama Pelanggan</label>
                  <input
                    value={form.customer_name}
                    onChange={(e) => setForm((p) => ({ ...p, customer_name: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-brand-primary"
                    placeholder="Nama pelanggan"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">No. HP Pelanggan</label>
                  <input
                    value={form.customer_phone}
                    onChange={(e) => setForm((p) => ({ ...p, customer_phone: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-brand-primary"
                    placeholder="08xxxxxxxxxx"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">PIC Pengantar</label>
                  <input
                    value={form.assigned_to_name}
                    onChange={(e) => setForm((p) => ({ ...p, assigned_to_name: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-brand-primary"
                    placeholder="Nama tim/driver"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Lokasi Antar / Ambil</label>
                <input
                  value={form.location_text}
                  onChange={(e) => setForm((p) => ({ ...p, location_text: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-brand-primary"
                  placeholder="Alamat lengkap / patokan"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Catatan (opsional)</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-brand-primary min-h-[96px]"
                  placeholder="Catatan tambahan untuk tim pengantar"
                />
              </div>

              <button
                type="submit"
                disabled={createLoading}
                className="w-full bg-brand-primary text-white py-4 rounded-2xl font-black text-lg hover:bg-rose-700 transition flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {createLoading ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
                {editId ? 'Simpan Perubahan' : 'Simpan Jadwal'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
