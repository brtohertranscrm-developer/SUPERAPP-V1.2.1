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
  Star,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { apiFetch } from '../../utils/api';
import TaskDetailSheet from '../../components/admin/logistics/TaskDetailSheet';

const MOTIVASI = [
  'Semangat — setiap tugas selesai bikin pelanggan happy!',
  'Hari ini kamu bisa handle semuanya, yuk mulai!',
  'Satu motor diantar, satu orang senang. Gas!',
  'Tugas lancar, pelanggan puas. Kamu yang terbaik!',
  'Tetap fokus, satu-satu pasti beres.',
];
const motivasiHariIni = MOTIVASI[new Date().getDay() % MOTIVASI.length];

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
    s === 'on' ? 'bg-emerald-100 text-emerald-700'
      : s === 'off' ? 'bg-slate-100 text-slate-700'
        : s === 'leave' ? 'bg-amber-100 text-amber-700'
          : 'bg-rose-100 text-rose-700';
  const label = s === 'on' ? 'ON' : s === 'off' ? 'LIBUR' : s === 'leave' ? 'CUTI' : 'SAKIT';
  return <span className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-widest ${palette}`}>{label}</span>;
};

const TaskStatusBadge = ({ status }) => {
  const s = String(status || 'scheduled').toLowerCase();
  const palette =
    s === 'completed' ? 'bg-emerald-100 text-emerald-700'
      : s === 'cancelled' ? 'bg-rose-100 text-rose-700'
        : 'bg-amber-100 text-amber-700';
  const label = s === 'completed' ? 'SELESAI' : s === 'cancelled' ? 'BATAL' : 'TERJADWAL';
  return <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest ${palette}`}>{label}</span>;
};

function StatCard({ icon, label, value, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-900 text-white',
    amber: 'bg-amber-500 text-white',
    emerald: 'bg-emerald-500 text-white',
    rose: 'bg-rose-500 text-white',
    blue: 'bg-blue-500 text-white',
    violet: 'bg-violet-500 text-white',
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

// Ringkasan personal stat kecil
function MiniStat({ label, value, color = 'slate' }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    violet: 'bg-violet-50 text-violet-700 border-violet-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    slate: 'bg-slate-50 text-slate-700 border-slate-100',
  };
  return (
    <div className={`rounded-2xl border px-4 py-3 ${colors[color]}`}>
      <div className="text-[10px] font-black uppercase tracking-widest opacity-70">{label}</div>
      <div className="mt-1 text-2xl font-black">{value}</div>
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
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [teamLoading, setTeamLoading] = useState(false);
  const [deliveryTasks, setDeliveryTasks] = useState([]);
  const [returnTasks, setReturnTasks] = useState([]);
  const [teamData, setTeamData] = useState([]);
  const [teamCounts, setTeamCounts] = useState({ total: 0, on: 0, off: 0, leave: 0, sick: 0 });
  const [error, setError] = useState('');

  // Prefer employee name from Manning table (matched by user_id) for a more personal greeting
  const myEmployee = useMemo(
    () => teamData.find((m) => m.user_id && m.user_id === user?.id),
    [teamData, user?.id]
  );
  const myName = myEmployee?.name || user?.name || '';

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

  // Tugas yang di-assign ke crew yang sedang login
  const myTasks = useMemo(
    () => myName
      ? allTasks.filter((t) => String(t?.assigned_to_name || '') === myName)
      : [],
    [allTasks, myName]
  );

  const myAntar = useMemo(() => myTasks.filter((t) => t.task_type === 'delivery').length, [myTasks]);
  const myAmbil = useMemo(() => myTasks.filter((t) => t.task_type === 'return').length, [myTasks]);
  const mySelesai = useMemo(() => myTasks.filter((t) => String(t.status || '') === 'completed').length, [myTasks]);
  const myTerjadwal = useMemo(() => myTasks.filter((t) => String(t.status || '') === 'scheduled').length, [myTasks]);

  // Tampilkan tugas sendiri di atas, sisanya setelahnya
  const sortedTasks = useMemo(() => {
    if (!myName || !search.trim()) {
      const mine = allTasks.filter((t) => String(t?.assigned_to_name || '') === myName);
      const others = allTasks.filter((t) => String(t?.assigned_to_name || '') !== myName);
      return [...mine, ...others];
    }
    return allTasks;
  }, [allTasks, myName, search]);

  const markComplete = async (taskId) => {
    if (!window.confirm('Tandai tugas ini sebagai selesai?')) return;
    try {
      await apiFetch(`/api/admin/logistics/tasks/${taskId}/complete`, { method: 'PATCH' });
      fetchBoard();
    } catch (err) {
      alert(err?.message || 'Gagal checklist tugas.');
    }
  };

  const handleCardClick = (taskId) => setSelectedTaskId(taskId);

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
      {/* Hero */}
      <div className="rounded-[32px] bg-slate-900 text-white p-6 shadow-xl overflow-hidden relative">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5" />
        <div className="absolute -bottom-16 right-20 w-40 h-40 rounded-full bg-rose-500/20 blur-2xl" />
        <div className="relative">
          <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/50">Dashboard Operasional</div>
          <h1 className="mt-2 text-3xl md:text-4xl font-black tracking-tight leading-none">
            {myName ? (
              <>Halo, <span className="text-rose-400">{myName.split(' ')[0]}</span>! 👋</>
            ) : 'Dashboard Tugas'}
          </h1>
          <p className="mt-2 text-sm text-white/60 font-medium italic">"{motivasiHariIni}"</p>
          <div className="mt-5 flex flex-col sm:flex-row gap-2">
            <Link
              to="/admin/logistics"
              className="rounded-2xl bg-white text-slate-900 px-4 py-3 text-sm font-black inline-flex items-center justify-center gap-2 hover:bg-slate-100 transition-colors"
            >
              <Truck size={16} /> Kelola Semua Jadwal
            </Link>
            <Link
              to="/admin/manning"
              className="rounded-2xl bg-white/10 text-white px-4 py-3 text-sm font-black inline-flex items-center justify-center gap-2 hover:bg-white/15 transition-colors"
            >
              <Users size={16} /> Tim & Libur
            </Link>
          </div>
        </div>
      </div>

      {/* Personal stats — hanya tampil jika ada tugas yang di-assign ke nama ini */}
      {myName && (myTasks.length > 0 || !isLoading) && (
        <div className="rounded-3xl bg-gradient-to-br from-blue-600 to-violet-600 p-5 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <Star size={16} className="text-yellow-300" />
            <div className="text-[10px] font-black uppercase tracking-widest text-white/70">Statistik Kamu Hari Ini</div>
          </div>
          {myTasks.length === 0 ? (
            <div className="text-sm font-bold text-white/60">
              Belum ada tugas yang di-assign ke <span className="font-black text-white">{myName}</span> untuk tanggal ini.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white/10 rounded-2xl px-4 py-3">
                  <div className="text-[10px] font-black uppercase tracking-widest text-white/60">Antar Motor</div>
                  <div className="mt-1 text-3xl font-black">{myAntar}</div>
                  <div className="text-[10px] text-white/50 font-bold">pengantaran</div>
                </div>
                <div className="bg-white/10 rounded-2xl px-4 py-3">
                  <div className="text-[10px] font-black uppercase tracking-widest text-white/60">Ambil Motor</div>
                  <div className="mt-1 text-3xl font-black">{myAmbil}</div>
                  <div className="text-[10px] text-white/50 font-bold">pengembalian</div>
                </div>
                <div className="bg-white/10 rounded-2xl px-4 py-3">
                  <div className="text-[10px] font-black uppercase tracking-widest text-white/60">Selesai</div>
                  <div className="mt-1 text-3xl font-black text-emerald-300">{mySelesai}</div>
                  <div className="text-[10px] text-white/50 font-bold">tugas done</div>
                </div>
                <div className="bg-white/10 rounded-2xl px-4 py-3">
                  <div className="text-[10px] font-black uppercase tracking-widest text-white/60">Sisa</div>
                  <div className="mt-1 text-3xl font-black text-amber-300">{myTerjadwal}</div>
                  <div className="text-[10px] text-white/50 font-bold">belum selesai</div>
                </div>
              </div>

              {/* Daftar transaksi yang di-handle */}
              <div className="mt-4">
                <div className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-2">Transaksi Yang Kamu Handle</div>
                <div className="flex flex-wrap gap-2">
                  {myTasks.map((t) => (
                    <div
                      key={t.id}
                      className="bg-white/10 rounded-xl px-3 py-1.5 text-xs font-bold flex items-center gap-1.5"
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${t.task_type === 'delivery' ? 'bg-amber-300' : 'bg-violet-300'}`} />
                      <span>{t.customer_name || 'Tanpa Nama'}</span>
                      {t.order_id && <span className="text-white/50">• {t.order_id}</span>}
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                        String(t.status) === 'completed'
                          ? 'bg-emerald-500/40 text-emerald-200'
                          : 'bg-amber-500/40 text-amber-200'
                      }`}>
                        {String(t.status) === 'completed' ? '✓' : t.task_type === 'delivery' ? 'ANTAR' : 'AMBIL'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Date filter + search + refresh */}
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
            onClick={() => { fetchBoard(); fetchTeam(); }}
            className="rounded-2xl bg-rose-600 px-4 py-3 text-sm font-black text-white inline-flex items-center justify-center gap-2 hover:bg-rose-700 transition-colors"
          >
            <RefreshCw size={16} /> Refresh Board
          </button>
        </div>
      </div>

      {/* Stat cards keseluruhan */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={<Truck size={22} />} label="Pengantaran Hari Ini" value={deliveryTasks.length} tone="amber" />
        <StatCard icon={<RotateCcw size={22} />} label="Pengembalian Hari Ini" value={returnTasks.length} tone="slate" />
        <StatCard icon={<Clock3 size={22} />} label="Belum Selesai" value={pendingTasks.length} tone="rose" />
        <StatCard icon={<Users size={22} />} label="Tim On Duty" value={teamCounts.on || 0} tone="emerald" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.45fr_0.95fr] gap-6">
        {/* Daftar tugas */}
        <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-xl font-black text-slate-900">Daftar Tugas Hari Ini</h2>
              <p className="text-sm text-slate-500 font-medium">
                Tugas kamu muncul paling atas. Urut dari jam terdekat.
              </p>
            </div>
            {isLoading ? <Loader2 className="animate-spin text-slate-400" size={18} /> : null}
          </div>

          {error ? (
            <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</div>
          ) : sortedTasks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-400 font-bold">
              Belum ada tugas untuk tanggal ini.
            </div>
          ) : (
            <div className="space-y-2">
              {sortedTasks.map((task) => {
                const taskType = String(task?.task_type || '').toLowerCase();
                const isDone = String(task?.status || '').toLowerCase() === 'completed';
                const isCancelled = String(task?.status || '').toLowerCase() === 'cancelled';
                const isMyTask = myName && String(task?.assigned_to_name || '') === myName;

                return (
                  <div
                    key={task.id}
                    onClick={() => handleCardClick(task.id)}
                    className={`rounded-2xl border p-4 transition cursor-pointer hover:shadow-md ${
                      isDone
                        ? 'border-slate-100 bg-slate-50 opacity-60'
                        : isMyTask
                        ? 'border-blue-200 bg-blue-50 hover:border-blue-300'
                        : 'border-slate-100 bg-white hover:border-slate-200'
                    }`}
                  >
                    {/* Row 1: badges + time */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-widest ${taskType === 'delivery' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
                          {taskType === 'delivery' ? 'ANTAR' : 'AMBIL'}
                        </span>
                        <TaskStatusBadge status={task.status} />
                        {isMyTask && !isDone && (
                          <span className="px-2 py-1 rounded-full text-[10px] font-black bg-blue-600 text-white">KAMU</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-black text-slate-500">{fmtDateTime(task.scheduled_at)}</span>
                        <span className="text-[10px] text-slate-300 font-black">›</span>
                      </div>
                    </div>

                    {/* Row 2: customer + motor */}
                    <div className="mt-2 flex items-baseline gap-2 min-w-0">
                      <span className="font-black text-slate-900 truncate">{task.customer_name || 'Tanpa nama'}</span>
                      <span className="text-xs text-slate-400 font-bold shrink-0">{task.motor_type || '—'}</span>
                    </div>

                    {/* Row 3: location + phone + PIC */}
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500 font-medium">
                      {task.location_text && (
                        <span className="flex items-center gap-1"><MapPin size={11} />{task.location_text}</span>
                      )}
                      {task.customer_phone && (
                        <span className="flex items-center gap-1"><Phone size={11} />{task.customer_phone}</span>
                      )}
                      {task.assigned_to_name && !isMyTask && (
                        <span className="font-black text-slate-400">PIC: {task.assigned_to_name}</span>
                      )}
                    </div>

                    {/* Quick actions — stop propagation so clicking WA/done doesn't open sheet */}
                    {!isCancelled && (
                      <div className="mt-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
                        {task.customer_phone && (
                          <a
                            href={`https://wa.me/${String(task.customer_phone).replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-50 inline-flex items-center gap-1.5"
                          >
                            <Phone size={13} /> WA
                          </a>
                        )}
                        {!isDone ? (
                          <button
                            onClick={() => markComplete(task.id)}
                            className={`rounded-xl px-3 py-2 text-xs font-black inline-flex items-center gap-1.5 ${
                              isMyTask
                                ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            <CheckCircle2 size={13} /> Selesai
                          </button>
                        ) : (
                          <span className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 inline-flex items-center gap-1.5">
                            <CheckCircle2 size={13} /> Done
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Sidebar: tim */}
        <section className="space-y-4">
          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Users size={16} className="text-slate-400" /> Tim Hari Ini
              </h2>
              <div className="flex items-center gap-2">
                {teamLoading && <Loader2 className="animate-spin text-slate-400" size={14} />}
                <span className="text-[11px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
                  {teamCounts.on || 0} on duty
                </span>
              </div>
            </div>

            {teamData.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-center text-slate-400 font-bold text-sm">
                Belum ada data tim.
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {teamData.map((member) => {
                  const isMe = myName && member.name === myName;
                  const memberTasks = allTasks.filter((t) => t.assigned_to_name === member.name);
                  const memberAntar = memberTasks.filter((t) => t.task_type === 'delivery').length;
                  const memberAmbil = memberTasks.filter((t) => t.task_type === 'return').length;
                  const isOn = String(member.status || 'on') === 'on';

                  return (
                    <div
                      key={member.id}
                      className={`py-3 flex items-center justify-between gap-3 ${isMe ? 'opacity-100' : ''}`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Avatar initial */}
                        <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-black ${
                          isMe ? 'bg-blue-600 text-white' : isOn ? 'bg-slate-200 text-slate-700' : 'bg-slate-100 text-slate-400'
                        }`}>
                          {member.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className={`font-black text-sm truncate ${isMe ? 'text-blue-700' : 'text-slate-900'}`}>
                              {member.name}
                            </span>
                            {isMe && <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-blue-600 text-white shrink-0">KAMU</span>}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {memberAntar > 0 && (
                              <span className="text-[10px] font-black text-amber-600">{memberAntar}A</span>
                            )}
                            {memberAmbil > 0 && (
                              <span className="text-[10px] font-black text-violet-600">{memberAmbil}R</span>
                            )}
                            {memberAntar === 0 && memberAmbil === 0 && (
                              <span className="text-[10px] text-slate-400 font-medium">–</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <TeamStatusBadge status={member.status} />
                    </div>
                  );
                })}
              </div>
            )}

            {/* Legend */}
            <div className="mt-3 pt-3 border-t border-slate-50 flex items-center gap-3 text-[10px] font-black text-slate-400">
              <span><span className="text-amber-600">A</span> = Antar</span>
              <span><span className="text-violet-600">R</span> = Return</span>
            </div>
          </div>
        </section>
      </div>

      {selectedTaskId && (
        <TaskDetailSheet
          taskId={selectedTaskId}
          isMyTask={!!myName && sortedTasks.find((t) => t.id === selectedTaskId)?.assigned_to_name === myName}
          onClose={() => setSelectedTaskId(null)}
          onMarkDone={() => { fetchBoard(); setSelectedTaskId(null); }}
        />
      )}
    </div>
  );
}
