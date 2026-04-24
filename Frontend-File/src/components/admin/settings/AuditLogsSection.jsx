import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Clock, Loader2, RefreshCw } from 'lucide-react';
import { API_URL } from './settingsConstants';

export default function AuditLogsSection({ token }) {
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

  const fmtDateTime = (d) => (d
    ? new Date(d).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—'
  );

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
                type="button"
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
                  <th className="p-4 font-bold text-center">Status</th>
                  <th className="p-4 rounded-r-xl font-bold">Context</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-slate-400 font-bold">
                      <div className="flex items-center gap-2">
                        <Loader2 size={16} className="animate-spin" /> Memuat log...
                      </div>
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-slate-400 font-bold">Belum ada aktivitas.</td>
                  </tr>
                ) : (
                  logs.map((l) => (
                    <tr key={l.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                      <td className="p-4 text-xs text-slate-500 font-bold whitespace-nowrap">{fmtDateTime(l.created_at)}</td>
                      <td className="p-4 text-xs text-slate-700 font-bold">{l.admin_email || l.admin_name || '—'}</td>
                      <td className="p-4 text-xs text-slate-700 font-bold">{l.action || '—'}</td>
                      <td className="p-4 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-black ${
                            Number(l.status_code) >= 400 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
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
}

