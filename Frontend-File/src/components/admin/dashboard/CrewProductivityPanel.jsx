import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCw, Trophy, Truck, RotateCcw, CheckCircle2 } from 'lucide-react';
import { apiFetch } from '../../../utils/api';

const todayYmd = () => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

const PERIOD_OPTIONS = [
  { value: 'today', label: 'Hari Ini' },
  { value: '7d', label: '7 Hari Terakhir' },
  { value: '30d', label: '30 Hari Terakhir' },
  { value: 'mtd', label: 'Bulan Ini' },
];

function getFromTo(period) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const today = ymd(now);
  const toStr = `${today}T23:59`;

  if (period === 'today') return { from: `${today}T00:00`, to: toStr };

  if (period === '7d') {
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    return { from: `${ymd(d)}T00:00`, to: toStr };
  }

  if (period === '30d') {
    const d = new Date(now);
    d.setDate(d.getDate() - 29);
    return { from: `${ymd(d)}T00:00`, to: toStr };
  }

  if (period === 'mtd') {
    const d = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: `${ymd(d)}T00:00`, to: toStr };
  }

  return { from: `${today}T00:00`, to: toStr };
}

// Badge ranking
function RankBadge({ rank }) {
  if (rank === 1) return <span className="text-lg">🥇</span>;
  if (rank === 2) return <span className="text-lg">🥈</span>;
  if (rank === 3) return <span className="text-lg">🥉</span>;
  return <span className="text-sm font-black text-slate-400">#{rank}</span>;
}

// Completion rate bar
function RateBar({ value, max }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-emerald-500 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] font-black text-slate-400 w-8 text-right">{pct}%</span>
    </div>
  );
}

export default function CrewProductivityPanel() {
  const [period, setPeriod] = useState('today');
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchStats = async () => {
    setIsLoading(true);
    setError('');
    try {
      const { from, to } = getFromTo(period);
      const qs = new URLSearchParams({ from, to }).toString();
      const res = await apiFetch(`/api/admin/logistics/crew-stats?${qs}`);
      setData(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      setError(err?.message || 'Gagal memuat statistik crew.');
      setData([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const totalAntar = useMemo(() => data.reduce((s, r) => s + (Number(r.antar) || 0), 0), [data]);
  const totalAmbil = useMemo(() => data.reduce((s, r) => s + (Number(r.ambil) || 0), 0), [data]);
  const totalSelesai = useMemo(() => data.reduce((s, r) => s + (Number(r.selesai) || 0), 0), [data]);
  const totalSemua = useMemo(() => data.reduce((s, r) => s + (Number(r.total) || 0), 0), [data]);

  return (
    <div className="mt-8 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-amber-500 p-3 text-white">
            <Trophy size={20} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">Produktivitas Tim Logistik</h2>
            <p className="text-sm text-slate-500 font-medium">Siapa paling produktif antar & ambil motor.</p>
          </div>
        </div>

        <div className="flex gap-2 items-center">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="bg-white border border-slate-200 rounded-2xl px-4 py-2 font-black text-sm text-slate-800 outline-none"
          >
            {PERIOD_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button
            onClick={fetchStats}
            disabled={isLoading}
            className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-50"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Summary bar */}
      {data.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="rounded-2xl bg-amber-50 border border-amber-100 px-4 py-3">
            <div className="text-[10px] font-black uppercase tracking-widest text-amber-700/70">Total Antar</div>
            <div className="mt-1 text-2xl font-black text-amber-700">{totalAntar}</div>
          </div>
          <div className="rounded-2xl bg-violet-50 border border-violet-100 px-4 py-3">
            <div className="text-[10px] font-black uppercase tracking-widest text-violet-700/70">Total Ambil</div>
            <div className="mt-1 text-2xl font-black text-violet-700">{totalAmbil}</div>
          </div>
          <div className="rounded-2xl bg-emerald-50 border border-emerald-100 px-4 py-3">
            <div className="text-[10px] font-black uppercase tracking-widest text-emerald-700/70">Selesai</div>
            <div className="mt-1 text-2xl font-black text-emerald-700">{totalSelesai}</div>
          </div>
          <div className="rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Total Tugas</div>
            <div className="mt-1 text-2xl font-black text-slate-800">{totalSemua}</div>
          </div>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex h-32 items-center justify-center text-slate-400">
          <Loader2 className="animate-spin mr-2" size={20} /> Memuat statistik...
        </div>
      ) : error ? (
        <div className="rounded-2xl bg-rose-50 text-rose-700 p-4 font-bold text-sm">{error}</div>
      ) : data.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-400 font-bold">
          Belum ada data tugas untuk periode ini.
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((row, idx) => {
            const rank = idx + 1;
            const antar = Number(row.antar) || 0;
            const ambil = Number(row.ambil) || 0;
            const total = Number(row.total) || 0;
            const selesai = Number(row.selesai) || 0;
            const terjadwal = Number(row.terjadwal) || 0;
            const isTop = rank <= 3;

            return (
              <div
                key={row.name}
                className={`rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center gap-4 ${
                  rank === 1
                    ? 'border-amber-200 bg-amber-50'
                    : rank === 2
                    ? 'border-slate-200 bg-slate-50'
                    : rank === 3
                    ? 'border-orange-100 bg-orange-50/50'
                    : 'border-slate-100 bg-white'
                }`}
              >
                {/* Rank + nama */}
                <div className="flex items-center gap-3 min-w-0 sm:w-48">
                  <div className="w-8 shrink-0 flex items-center justify-center">
                    <RankBadge rank={rank} />
                  </div>
                  <div className="min-w-0">
                    <div className="font-black text-slate-900 truncate" title={row.name}>{row.name}</div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {total} tugas total
                    </div>
                  </div>
                </div>

                {/* Stat pills */}
                <div className="flex flex-wrap gap-2 flex-1">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 text-amber-700 text-xs font-black">
                    <Truck size={12} />
                    {antar}× antar
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-100 text-violet-700 text-xs font-black">
                    <RotateCcw size={12} />
                    {ambil}× ambil
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-700 text-xs font-black">
                    <CheckCircle2 size={12} />
                    {selesai} selesai
                  </div>
                  {terjadwal > 0 && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-xs font-black">
                      {terjadwal} terjadwal
                    </div>
                  )}
                </div>

                {/* Completion rate bar */}
                <div className="sm:w-36 shrink-0">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Selesai Rate</div>
                  <RateBar value={selesai} max={total} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
