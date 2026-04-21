import { useState, useEffect, useCallback } from "react";
import {
  Users, Award, TrendingUp, Search, ChevronDown, ChevronUp,
  Loader2, RefreshCw, Trophy
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL?.trim() || "";

const apiFetch = async (path) => {
  const token = localStorage.getItem("token") || localStorage.getItem("admin_token");
  const res = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  return res.json();
};

const StatusBadge = ({ status }) => {
  const map = {
    registered:    { label: "Terdaftar",       cls: "bg-blue-50 text-blue-600 border-blue-200" },
    first_booking: { label: "Booking Selesai", cls: "bg-green-50 text-green-600 border-green-200" },
  };
  const d = map[status] || { label: status, cls: "bg-slate-50 text-slate-600 border-slate-200" };
  return (
    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${d.cls}`}>
      {d.label}
    </span>
  );
};

export default function AdminReferral() {
  const [stats,       setStats]       = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [logs,        setLogs]        = useState([]);
  const [pagination,  setPagination]  = useState({ page: 1, total: 0, limit: 10 });
  const [filters,     setFilters]     = useState({ status: "", search: "" });
  const [tab,         setTab]         = useState("stats");
  const [loading,     setLoading]     = useState(true);
  const [expandedId,  setExpandedId]  = useState(null);

  const fetchStats = useCallback(async () => {
    const [statsRes, lbRes] = await Promise.all([
      apiFetch("/api/admin/referral/stats"),
      apiFetch("/api/admin/referral/leaderboard?limit=10"),
    ]);
    if (statsRes.success)   setStats(statsRes.data);
    if (lbRes.success)      setLeaderboard(lbRes.data);
  }, []);

  const fetchLogs = useCallback(async () => {
    const { page, limit } = pagination;
    const params = new URLSearchParams({ page, limit, ...(filters.status && { status: filters.status }) }).toString();
    const res = await apiFetch(`/api/admin/referral/logs?${params}`);
    if (res.success) {
      setLogs(res.data);
      setPagination((p) => ({ ...p, total: res.total || 0 }));
    }
  }, [pagination.page, filters.status]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchLogs()]);
      setLoading(false);
    };
    load();
  }, [fetchStats, fetchLogs]);

  const handleRefresh = async () => {
    setLoading(true);
    await Promise.all([fetchStats(), fetchLogs()]);
    setLoading(false);
  };

  const filteredLogs = logs.filter((l) => {
    if (!filters.search) return true;
    const q = filters.search.toLowerCase();
    return (
      (l.referrer_name || "").toLowerCase().includes(q) ||
      (l.referee_name  || "").toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(pagination.total / pagination.limit);

  return (
    <div className="animate-fade-in-up pb-10">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="text-indigo-500" /> Manajemen Referral
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-1">Monitor program referral dan distribusi Miles.</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {/* TABS */}
      <div className="flex gap-1 bg-white rounded-2xl p-1.5 border border-slate-100 shadow-sm mb-6">
        {[
          { key: "stats",       label: "Statistik & Leaderboard" },
          { key: "logs",        label: "Log Referral" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
              tab === t.key ? "bg-slate-900 text-white shadow-md" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-indigo-500" size={40} />
        </div>
      ) : (
        <>
          {/* ── TAB: STATS ── */}
          {tab === "stats" && (
            <div className="space-y-6">

              {/* Metric Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Total Referrer",    value: stats?.total_referrers      || 0, icon: <Users size={20} />,       color: "text-blue-600",   bg: "bg-blue-50" },
                  { label: "Total Invite",       value: stats?.total_invites        || 0, icon: <TrendingUp size={20} />,  color: "text-green-600",  bg: "bg-green-50" },
                  { label: "Berhasil",           value: stats?.successful_invites   || 0, icon: <Award size={20} />,       color: "text-amber-600",  bg: "bg-amber-50" },
                  { label: "Miles Terdistribusi",value: (stats?.total_miles_distributed || 0).toLocaleString("id-ID"), icon: <Trophy size={20} />, color: "text-purple-600", bg: "bg-purple-50" },
                ].map((s, i) => (
                  <div key={i} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
                    <div className={`w-10 h-10 ${s.bg} ${s.color} rounded-xl flex items-center justify-center mb-3`}>{s.icon}</div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{s.label}</p>
                    <p className="text-xl font-black text-slate-800">{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Conversion Rate */}
              {stats && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                  <h3 className="font-black text-slate-800 text-sm mb-4">Conversion Rate</h3>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-700"
                        style={{ width: `${Math.min(stats.conversion_rate || 0, 100)}%` }}
                      />
                    </div>
                    <span className="font-black text-indigo-600 text-sm">{stats.conversion_rate || 0}%</span>
                  </div>
                  <p className="text-xs text-slate-400 font-medium mt-2">
                    {stats.successful_invites} dari {stats.total_invites} invite berhasil (booking selesai)
                  </p>
                </div>
              )}

              {/* Leaderboard */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-5 border-b border-slate-100">
                  <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                    <Trophy size={16} className="text-amber-500" /> Top Referrers
                  </h3>
                </div>
                <div className="divide-y divide-slate-100">
                  {leaderboard.length === 0 ? (
                    <div className="p-10 text-center text-slate-400 font-bold text-sm">Belum ada data leaderboard.</div>
                  ) : (
                    leaderboard.map((item, i) => {
                      const rankColors = ["bg-amber-100 text-amber-700", "bg-slate-100 text-slate-600", "bg-orange-100 text-orange-700"];
                      return (
                        <div key={i} className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${rankColors[i] || "bg-slate-50 text-slate-500"}`}>
                              #{i + 1}
                            </div>
                            <div>
                              <p className="font-black text-slate-900 text-sm">{item.referrer_name}</p>
                              <p className="text-[10px] font-bold text-slate-400">{item.referrer_email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-right">
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 mb-0.5">Invite Berhasil</p>
                              <p className="font-black text-slate-900">{item.successful_invites}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 mb-0.5">Miles</p>
                              <p className="font-black text-amber-600">{item.total_miles_earned?.toLocaleString("id-ID")}</p>
                            </div>
                            {item.tier_label && (
                              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-black rounded-lg border border-purple-200">
                                {item.tier_label}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── TAB: LOGS ── */}
          {tab === "logs" && (
            <div className="space-y-5">

              {/* Filter Bar */}
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari nama referrer atau referee..."
                    value={filters.search}
                    onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                  />
                </div>
                <select
                  value={filters.status}
                  onChange={(e) => { setFilters((f) => ({ ...f, status: e.target.value })); setPagination((p) => ({ ...p, page: 1 })); }}
                  className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
                >
                  <option value="">Semua Status</option>
                  <option value="registered">Terdaftar</option>
                  <option value="first_booking">Booking Selesai</option>
                </select>
              </div>

              {/* Log Cards */}
              {filteredLogs.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 text-center text-slate-400 font-bold">
                  Belum ada log referral yang cocok.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredLogs.map((log) => {
                    const isExpanded = expandedId === log.id;
                    return (
                      <div key={log.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div
                          onClick={() => setExpandedId(isExpanded ? null : log.id)}
                          className="p-4 cursor-pointer hover:bg-slate-50 flex items-center justify-between gap-3 transition-colors"
                        >
                          <div className="overflow-hidden flex-1">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Referee</p>
                            <p className="font-black text-slate-900 text-sm truncate">{log.referee_name}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <StatusBadge status={log.status} />
                            <div className="text-slate-400">
                              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                            </div>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="border-t border-slate-100 p-4 bg-slate-50/50 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="bg-white rounded-xl p-3 border border-slate-100">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Referrer</p>
                                <p className="font-black text-slate-900 text-xs">{log.referrer_name}</p>
                              </div>
                              <div className="bg-white rounded-xl p-3 border border-slate-100">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Miles Referrer</p>
                                <p className="font-black text-amber-600 text-xs">+{log.miles_referrer} Miles</p>
                              </div>
                              <div className="bg-white rounded-xl p-3 border border-slate-100">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Miles Referee</p>
                                <p className="font-black text-blue-600 text-xs">+{log.miles_referee} Miles</p>
                              </div>
                              <div className="bg-white rounded-xl p-3 border border-slate-100">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tanggal Daftar</p>
                                <p className="font-black text-slate-900 text-xs">
                                  {log.registered_at ? new Date(log.registered_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-"}
                                </p>
                              </div>
                            </div>
                            {log.tier_label && (
                              <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 flex justify-between items-center">
                                <p className="text-xs font-bold text-purple-700">Bonus Tier: {log.tier_label}</p>
                                <p className="text-xs font-black text-purple-700">+{log.tier_bonus_awarded} Miles</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2">
                  <button
                    disabled={pagination.page === 1}
                    onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                    className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold disabled:opacity-50 hover:bg-slate-50 transition-colors"
                  >
                    Sebelumnya
                  </button>
                  <span className="px-4 py-2 text-sm font-bold text-slate-600">
                    {pagination.page} / {totalPages}
                  </span>
                  <button
                    disabled={pagination.page >= totalPages}
                    onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                    className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold disabled:opacity-50 hover:bg-slate-50 transition-colors"
                  >
                    Berikutnya
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
