import React, { useContext, useEffect, useMemo, useState } from 'react';
import {
  Truck,
  RotateCcw,
  CheckCircle2,
  Clock3,
  Users,
  Phone,
  MapPin,
  RefreshCw,
  Loader2,
  Search,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { apiFetch } from '../../utils/api';

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

const todayYmd = () => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

const fmtDateTime = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const TeamStatusBadge = ({ status }) => {
  const s = String(status || 'on').toLowerCase();
  const palette =
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

  return <span className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-widest ${palette}`}>{label}</span>;
};

const TaskStatusBadge = ({ status }) => {
  const s = String(status || 'scheduled').toLowerCase();
  const palette =
    s === 'completed'
      ? 'bg-emerald-100 text-emerald-700'
      : s === 'cancelled'
        ? 'bg-rose-100 text-rose-700'
        : 'bg-amber-100 text-amber-700';
  const label =
    s === 'completed' ? 'SELESAI'
      : s === 'cancelled' ? 'BATAL'
        : 'TERJADWAL';

  return <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest ${palette}`}>{label}</span>;
};

function StatCard({ icon, label, value, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-900 text-white',
    amber: 'bg-amber-500 text-white',
    emerald: 'bg-emerald-500 text-white',
    rose: 'bg-rose-500 text-white',
  };

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</div>
          <div className="mt-2 text-3xl font-black text-slate-900">{value}</div>
        </div>
        <div className={`rounded-2xl p-3 ${tones[tone] || tones.slate}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function AdminStaffDashboard() {
  const { user } = useContext(AuthContext) || {};
  const perms = useMemo(() => parsePerms(user), [user]);
  const isSuperAdmin = user?.role === 'superadmin' || user?.role === 'admin';
  const canLogistics = isSuperAdmin || perms.includes('logistics');

  const [selectedDate, setSelectedDate] = useState(todayYmd());
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [teamLoading, setTeamLoading] = useState(false);
  const [deliveryTasks, setDeliveryTasks] = useState([]);
  const [returnTasks, setReturnTasks] = useState([]);
  const [teamData, setTeamData] = useState([]);
  const [teamCounts, setTeamCounts] = useState({ total: 0, on: 0, off: 0, leave: 0, sick: 0 });
  const [error, setError] = useState('');

  const taskQuery = useMemo(() => {
    const from = `${selectedDate}T00:00`;
    const to = `${selectedDate}T23:59`;
    const params = new URLSearchParams({ from, to });
    if (search.trim()) params.set('q', search.trim());
    return params.toString();
  }, [selectedDate, search]);

  const fetchBoard = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [delivery, ret] = await Promise.all([
        apiFetch(`/api/admin/logistics/tasks?task_type=delivery&${taskQuery}`),
        apiFetch(`/api/admin/logistics/tasks?task_type=return&${taskQuery}`),
      ]);
      setDeliveryTasks(Array.isArray(delivery?.data) ? delivery.data : []);
      setReturnTasks(Array.isArray(ret?.data) ? ret.data : []);
    } catch (err) {
      setError(err?.message || 'Gagal memuat board operasional.');
      setDeliveryTasks([]);
      setReturnTasks([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTeam = async () => {
    setTeamLoading(true);
    try {
      const data = await apiFetch(`/api/admin/manning/today?date=${encodeURIComponent(selectedDate)}`);
      setTeamData(Array.isArray(data?.data) ? data.data : []);
      setTeamCounts(data?.counts || { total: 0, on: 0, off: 0, leave: 0, sick: 0 });
    } catch {
      setTeamData([]);
      setTeamCounts({ total: 0, on: 0, off: 0, leave: 0, sick: 0 });
    } finally {
      setTeamLoading(false);
    }
  };

  useEffect(() => {
    if (!canLogistics) return;
    fetchBoard();
    fetchTeam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskQuery, selectedDate, canLogistics]);

  const allTasks = useMemo(
    () => [...deliveryTasks, ...returnTasks].sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at)),
    [deliveryTasks, returnTasks]
  );

  const pendingTasks = useMemo(
    () => allTasks.filter((t) => String(t?.status || '').toLowerCase() === 'scheduled'),
    [allTasks]
  );

  const markComplete = async (taskId) => {
    if (!window.confirm('Tandai tugas ini sebagai selesai?')) return;
    try {
      await apiFetch(`/api/admin/logistics/tasks/${taskId}/complete`, { method: 'PATCH' });
      fetchBoard();
    } catch (err) {
      alert(err?.message || 'Gagal checklist tugas.');
    }
  };

  if (!canLogistics) {
    return (
      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="text-lg font-black text-slate-900">Akses terbatas</div>
        <p className="mt-2 text-sm font-medium text-slate-500">
          Dashboard staf operasional butuh permission <span className="font-black">logistics</span>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="rounded-[32px] bg-slate-900 text-white p-6 shadow-xl overflow-hidden relative">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5" />
        <div className="absolute -bottom-16 right-20 w-40 h-40 rounded-full bg-rose-500/20 blur-2xl" />
        <div className="relative">
          <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/60">Mulai Kerja Hari Ini</div>
          <h1 className="mt-3 text-3xl md:text-4xl font-black tracking-tight leading-none">Tugas Hari Ini</h1>
          <p className="mt-3 max-w-2xl text-sm md:text-base text-white/75 font-medium">
            Halaman ini untuk melihat tugas yang harus dikerjakan sekarang, siapa tim yang aktif, dan menyelesaikan checklist lapangan dengan cepat.
          </p>
          <div className="mt-5 flex flex-col sm:flex-row gap-2">
            <Link
              to="/admin/logistics"
              className="rounded-2xl bg-white text-slate-900 px-4 py-3 text-sm font-black inline-flex items-center justify-center gap-2 hover:bg-slate-100 transition-colors"
            >
              <Truck size={16} /> Lihat / Kelola Semua Jadwal
            </Link>
            <Link
              to="/admin/manning"
              className="rounded-2xl bg-white/10 text-white px-4 py-3 text-sm font-black inline-flex items-center justify-center gap-2 hover:bg-white/15 transition-colors"
            >
              <Users size={16} /> Lihat Tim & Libur
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5">
          <div className="text-[10px] font-black uppercase tracking-widest text-emerald-700/70">Halaman Ini Untuk</div>
          <div className="mt-2 text-lg font-black text-emerald-900">Melihat tugas yang harus dikerjakan hari ini</div>
          <p className="mt-2 text-sm font-medium text-emerald-800/80">
            Cocok untuk staf lapangan yang butuh daftar tugas, tombol hubungi customer, dan checklist selesai.
          </p>
        </div>
        <div className="rounded-3xl border border-amber-100 bg-amber-50 p-5">
          <div className="text-[10px] font-black uppercase tracking-widest text-amber-700/70">Kalau Butuh Detail Penuh</div>
          <div className="mt-2 text-lg font-black text-amber-900">Buka menu “Kelola Jadwal”</div>
          <p className="mt-2 text-sm font-medium text-amber-800/80">
            Di sana admin operasional bisa lihat semua jadwal, filter tanggal, edit, buat jadwal baru, atau cek detail tugas.
          </p>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-100 bg-white p-4 md:p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-900 outline-none"
            />
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3">
              <Search size={16} className="text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari customer, motor, order ID..."
                className="w-full min-w-[220px] text-sm font-bold text-slate-900 outline-none"
              />
            </div>
          </div>

          <button
            onClick={() => {
              fetchBoard();
              fetchTeam();
            }}
            className="rounded-2xl bg-rose-600 px-4 py-3 text-sm font-black text-white inline-flex items-center justify-center gap-2 hover:bg-rose-700 transition-colors"
          >
            <RefreshCw size={16} /> Refresh Board
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={<Truck size={22} />} label="Pengantaran Hari Ini" value={deliveryTasks.length} tone="amber" />
        <StatCard icon={<RotateCcw size={22} />} label="Pengembalian Hari Ini" value={returnTasks.length} tone="slate" />
        <StatCard icon={<Clock3 size={22} />} label="Belum Selesai" value={pendingTasks.length} tone="rose" />
        <StatCard icon={<Users size={22} />} label="Tim On Duty" value={teamCounts.on || 0} tone="emerald" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.45fr_0.95fr] gap-6">
        <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-xl font-black text-slate-900">Daftar Tugas Hari Ini</h2>
              <p className="text-sm text-slate-500 font-medium">Urut dari jam terdekat. Selesaikan dari yang paling atas lebih dulu.</p>
            </div>
            {isLoading ? <Loader2 className="animate-spin text-slate-400" size={18} /> : null}
          </div>

          {error ? (
            <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</div>
          ) : allTasks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-400 font-bold">
              Belum ada tugas untuk tanggal ini.
            </div>
          ) : (
            <div className="space-y-3">
              {allTasks.map((task) => {
                const taskType = String(task?.task_type || '').toLowerCase();
                const isDone = String(task?.status || '').toLowerCase() === 'completed';
                return (
                  <div key={task.id} className="rounded-3xl border border-slate-100 bg-slate-50 p-4 md:p-5">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest ${taskType === 'delivery' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
                            {taskType === 'delivery' ? 'PENGANTARAN' : 'PENGEMBALIAN'}
                          </span>
                          <TaskStatusBadge status={task.status} />
                        </div>
                        <h3 className="mt-3 text-lg font-black text-slate-900">{task.customer_name || 'Tanpa nama customer'}</h3>
                        <div className="mt-1 text-sm font-bold text-slate-500">
                          {task.motor_type || 'Motor belum diisi'} {task.order_id ? `• ${task.order_id}` : ''}
                        </div>
                      </div>

                      <div className="text-left md:text-right">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Jadwal</div>
                        <div className="mt-1 text-sm font-black text-slate-900">{fmtDateTime(task.scheduled_at)}</div>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-start gap-2 text-slate-700">
                        <MapPin size={16} className="mt-0.5 text-slate-400 shrink-0" />
                        <span className="font-medium">{task.location_text || 'Lokasi belum diisi'}</span>
                      </div>
                      <div className="flex items-start gap-2 text-slate-700">
                        <Phone size={16} className="mt-0.5 text-slate-400 shrink-0" />
                        <span className="font-medium">{task.customer_phone || 'Kontak belum diisi'}</span>
                      </div>
                    </div>

                    {task.notes ? (
                      <div className="mt-3 rounded-2xl bg-white px-4 py-3 text-sm text-slate-600 font-medium border border-slate-100">
                        {task.notes}
                      </div>
                    ) : null}

                    <div className="mt-4 flex flex-col sm:flex-row gap-2">
                      {task.customer_phone ? (
                        <a
                          href={`https://wa.me/${String(task.customer_phone).replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-700 hover:bg-white transition-colors inline-flex items-center justify-center gap-2"
                        >
                          <Phone size={16} /> Hubungi Customer
                        </a>
                      ) : null}

                      {!isDone ? (
                        <button
                          onClick={() => markComplete(task.id)}
                          className="rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-black text-white hover:bg-emerald-600 transition-colors inline-flex items-center justify-center gap-2"
                        >
                          <CheckCircle2 size={16} /> Checklist Selesai
                        </button>
                      ) : (
                        <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700 inline-flex items-center gap-2">
                          <CheckCircle2 size={16} /> Tugas sudah selesai
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="space-y-6">
          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-xl font-black text-slate-900">Siapa Yang Sedang Bertugas</h2>
                <p className="text-sm text-slate-500 font-medium">Data ini diambil dari menu Tim & Libur untuk tanggal yang sedang dipilih.</p>
              </div>
              {teamLoading ? <Loader2 className="animate-spin text-slate-400" size={18} /> : null}
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="rounded-2xl bg-emerald-50 p-4">
                <div className="text-[10px] font-black uppercase tracking-widest text-emerald-700/70">On Duty</div>
                <div className="mt-2 text-2xl font-black text-emerald-700">{teamCounts.on || 0}</div>
              </div>
              <div className="rounded-2xl bg-slate-100 p-4">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Total Tim</div>
                <div className="mt-2 text-2xl font-black text-slate-800">{teamCounts.total || 0}</div>
              </div>
            </div>

            {teamData.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-slate-400 font-bold">
                Belum ada data tim.
              </div>
            ) : (
              <div className="space-y-3">
                {teamData.map((member) => (
                  <div key={member.id} className="rounded-2xl bg-slate-50 border border-slate-100 p-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-black text-slate-900 truncate">{member.name}</div>
                      <div className="text-xs font-bold text-slate-500 mt-1">
                        {member.base_location || '—'} • {member.role_tag || 'delivery'}
                      </div>
                      {member.note ? (
                        <div className="mt-2 text-xs text-slate-500 font-medium">{member.note}</div>
                      ) : null}
                    </div>
                    <TeamStatusBadge status={member.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
