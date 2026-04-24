import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Loader2, MapPin, Clock, User, Phone, Bike, Plus, RefreshCw, Pencil, Trash2 } from 'lucide-react';
import { apiFetch } from '../../utils/api';
import { AuthContext } from '../../context/AuthContext';
import StatusBadge from '../../components/admin/logistics/StatusBadge';
import TeamTodaySection from '../../components/admin/logistics/TeamTodaySection';
import PendingBookingsSection from '../../components/admin/logistics/PendingBookingsSection';
import TaskDetailModal from '../../components/admin/logistics/TaskDetailModal';
import TaskCreateModal from '../../components/admin/logistics/TaskCreateModal';
import QuickAssignDropdown from '../../components/admin/logistics/QuickAssignDropdown';
import {
  fmtDate,
  fmtDateTime,
  parsePerms,
  shiftYmd,
  todayYmd,
  formatRupiah,
} from '../../components/admin/logistics/logisticsUtils';

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

  // Booking Cards (auto create logistics tasks)
  const [pendingBookings, setPendingBookings] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingError, setPendingError] = useState('');
  const [prefillBooking, setPrefillBooking] = useState(null);

  // Team Today (Manning)
  const [teamLoc, setTeamLoc] = useState('Semua');
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamData, setTeamData] = useState([]);
  const [teamCounts, setTeamCounts] = useState(null);

  // All tasks for selected date (both tabs) used for admin workload counter
  const [allTasksForCounts, setAllTasksForCounts] = useState([]);

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

  const fetchTasksForCounts = async () => {
    if (showAllDates) { setAllTasksForCounts([]); return; }
    try {
      const qs = `&from=${encodeURIComponent(`${selectedDate}T00:00`)}&to=${encodeURIComponent(`${selectedDate}T23:59`)}`;
      const [d, r] = await Promise.all([
        apiFetch(`/api/admin/logistics/tasks?task_type=delivery${qs}`),
        apiFetch(`/api/admin/logistics/tasks?task_type=return${qs}`),
      ]);
      setAllTasksForCounts([
        ...(Array.isArray(d?.data) ? d.data.map((t) => ({ ...t, task_type: 'delivery' })) : []),
        ...(Array.isArray(r?.data) ? r.data.map((t) => ({ ...t, task_type: 'return' })) : []),
      ]);
    } catch {
      setAllTasksForCounts([]);
    }
  };

  // Berapa kali tiap admin antar/ambil pada hari yang dipilih
  const adminTaskCounts = useMemo(() => {
    const counts = {};
    for (const t of allTasksForCounts) {
      const name = t.assigned_to_name;
      if (!name) continue;
      if (!counts[name]) counts[name] = { antar: 0, ambil: 0 };
      if (t.task_type === 'delivery') counts[name].antar += 1;
      else counts[name].ambil += 1;
    }
    return counts;
  }, [allTasksForCounts]);

  const fetchPendingBookings = async () => {
    setPendingLoading(true);
    setPendingError('');
    try {
      const data = await apiFetch(`/api/admin/logistics/pending-bookings?task_type=${activeTab}&date=${selectedDate}`);
      setPendingBookings(Array.isArray(data?.data) ? data.data : []);
    } catch (err) {
      setPendingError(err?.message || 'Gagal memuat booking.');
      setPendingBookings([]);
    } finally {
      setPendingLoading(false);
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
    fetchPendingBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedDate]);

  useEffect(() => {
    fetchTeam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, teamLoc]);

  useEffect(() => {
    fetchTasksForCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, showAllDates]);

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
      await Promise.all([fetchTasks(), fetchTasksForCounts()]);
      if (selected?.id === taskId) {
        const detail = await apiFetch(`/api/admin/logistics/tasks/${taskId}`);
        setSelected(detail?.data || null);
      }
    } catch (err) {
      alert(err?.message || 'Gagal checklist.');
    }
  };

  // Ganti PIC langsung dari card tanpa buka modal edit
  const handleQuickAssign = async (taskId, assignedName) => {
    await apiFetch(`/api/admin/logistics/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify({ assigned_to_name: assignedName || null }),
    });
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, assigned_to_name: assignedName || null } : t))
    );
    // Update workload counter setelah re-assign
    await fetchTasksForCounts();
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
    setPrefillBooking(null);
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
    setPrefillBooking(null);
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
      await Promise.all([fetchTasks(), fetchTasksForCounts()]);
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

      const ymd = form.scheduled_at ? String(form.scheduled_at).slice(0, 10) : '';
      if (ymd && /^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
        setShowAllDates(false);
        setSelectedDate(ymd);
      }

      setIsCreateOpen(false);
      setEditId(null);
      setPrefillBooking(null);
      resetForm();
      await Promise.all([fetchTasks(), fetchPendingBookings(), fetchTasksForCounts()]);
    } catch (err) {
      alert(err?.message || 'Gagal membuat jadwal.');
    } finally {
      setCreateLoading(false);
    }
  };

  const openCreateFromBooking = (b) => {
    if (!canManage) return;
    setEditId(null);
    setPrefillBooking(b || null);
    resetForm();
    setIsCreateOpen(true);
    setForm((p) => ({
      ...p,
      order_id: b?.order_id || '',
      scheduled_at: toDatetimeLocal(b?.suggested_at || ''),
      motor_type: b?.item_name || '',
      customer_name: b?.user_name || '',
      customer_phone: b?.user_phone || '',
      location_text: b?.delivery_address || '',
      assigned_to_name: '',
      notes: '',
    }));
  };

  const title = activeTab === 'delivery' ? 'Kelola Jadwal Pengantaran' : 'Kelola Jadwal Pengembalian';
  const headerDateText = showAllDates ? 'Semua Tanggal' : fmtDate(`${selectedDate}T00:00`);
  const teamOn = useMemo(
    () => (teamData || []).filter((m) => String(m?.status || 'on').toLowerCase() === 'on'),
    [teamData]
  );

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
          <div className="mt-2 text-lg font-black text-emerald-900">Lebih mudah mulai dari menu "Tugas Hari Ini"</div>
          <p className="mt-2 text-sm font-medium text-emerald-900/75">
            Di sana tugas ditampilkan lebih ringkas dan langsung ada tombol hubungi customer serta checklist selesai.
          </p>
        </div>
      </div>

      <TeamTodaySection
        selectedDate={selectedDate}
        teamCounts={teamCounts}
        teamLoc={teamLoc}
        onTeamLocChange={setTeamLoc}
        onRefresh={fetchTeam}
        isLoading={teamLoading}
        teamData={teamData}
        adminTaskCounts={adminTaskCounts}
      />

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

      <PendingBookingsSection
        activeTab={activeTab}
        pendingBookings={pendingBookings}
        isLoading={pendingLoading}
        error={pendingError}
        canManage={canManage}
        onRefresh={fetchPendingBookings}
        onSelectBooking={openCreateFromBooking}
      />

      {/* Daftar Jadwal */}
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
              <TaskCard
                key={t.id}
                task={t}
                canManage={canManage}
                teamOn={teamOn}
                adminTaskCounts={adminTaskCounts}
                onOpen={() => openDetail(t)}
                onEdit={() => openEdit(t, { preferDetail: false })}
                onDelete={() => handleDelete(t.id)}
                onQuickAssign={handleQuickAssign}
              />
            ))}
          </div>
        )}
      </div>

      <TaskDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={title}
        selected={selected}
        detailLoading={detailLoading}
        canManage={canManage}
        onEdit={() => openEdit(selected, { preferDetail: true })}
        onDelete={() => { if (selected?.id) handleDelete(selected.id); }}
        onComplete={() => { if (selected?.id) handleComplete(selected.id); }}
        fmtDateTime={fmtDateTime}
        formatRupiah={formatRupiah}
      />

      <TaskCreateModal
        isOpen={isCreateOpen}
        onClose={() => { setIsCreateOpen(false); setEditId(null); }}
        title={title}
        editId={editId}
        handleCreate={handleCreate}
        form={form}
        setForm={setForm}
        teamOn={teamOn}
        prefillBooking={prefillBooking}
        createLoading={createLoading}
      />
    </div>
  );
}

// Card jadwal individual dengan info booking dan quick-assign PIC
function TaskCard({ task: t, canManage, teamOn, adminTaskCounts, onOpen, onEdit, onDelete, onQuickAssign }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter') onOpen(); }}
      className="text-left bg-gray-50 border border-gray-100 rounded-3xl p-5 hover:bg-white hover:border-gray-200 transition shadow-sm cursor-pointer"
    >
      {/* Header: motor + status + aksi */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Bike size={14} className="text-brand-primary shrink-0" />
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Motor</span>
          </div>
          <div className="text-lg font-black text-gray-900 mt-0.5 truncate">{t.motor_type || '—'}</div>
          {t.order_id && (
            <div className="text-xs text-gray-400 font-bold mt-0.5 truncate">{t.order_id}</div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={t.status} />
          {canManage && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                className="p-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:text-brand-primary hover:border-brand-primary"
                title="Edit jadwal"
              >
                <Pencil size={15} />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="p-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:text-rose-600 hover:border-rose-300"
                title="Hapus jadwal"
              >
                <Trash2 size={15} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Info grid */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-sm">
        <div className="flex items-center gap-2 text-gray-700">
          <User size={14} className="text-brand-primary shrink-0" />
          <span className="font-bold truncate" title={t.customer_name || ''}>{t.customer_name || '—'}</span>
        </div>
        {t.customer_phone ? (
          <div
            className="flex items-center gap-2 text-gray-700"
            onClick={(e) => e.stopPropagation()}
            role="presentation"
          >
            <Phone size={14} className="text-brand-primary shrink-0" />
            <a
              href={`tel:${t.customer_phone}`}
              className="font-bold truncate hover:text-brand-primary"
              title={t.customer_phone}
            >
              {t.customer_phone}
            </a>
          </div>
        ) : null}
        <div className="flex items-center gap-2 text-gray-700">
          <Clock size={14} className="text-brand-primary shrink-0" />
          <span className="font-bold">{fmtDateTime(t.scheduled_at)}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-700 sm:col-span-2">
          <MapPin size={14} className="text-brand-primary shrink-0" />
          <span className="font-bold truncate" title={t.location_text || ''}>{t.location_text || '—'}</span>
        </div>
      </div>

      {/* PIC quick-assign — klik dropdown tidak buka detail modal */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">PIC Pengantar</div>
        {canManage ? (
          <QuickAssignDropdown
            taskId={t.id}
            currentAssignee={t.assigned_to_name}
            teamOn={teamOn}
            adminTaskCounts={adminTaskCounts}
            onAssign={onQuickAssign}
          />
        ) : (
          <div className="text-sm font-bold text-gray-700">{t.assigned_to_name || '—'}</div>
        )}
      </div>
    </div>
  );
}
