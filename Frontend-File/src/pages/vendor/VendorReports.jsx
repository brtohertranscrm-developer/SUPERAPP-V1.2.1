import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCcw, Download, XCircle } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL?.trim() || '';

const authHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const todayYmd = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const toCsv = (rows = []) => {
  const escape = (v) => `"${String(v ?? '').replace(/\"/g, '""')}"`;
  const headers = [
    'voucher_code',
    'order_id',
    'visit_date',
    'status',
    'product_title',
    'variant_name',
    'variant_price',
    'used_at',
  ];
  const lines = [headers.map(escape).join(',')];
  for (const r of rows) {
    lines.push(headers.map((h) => escape(r?.[h])).join(','));
  }
  return lines.join('\n');
};

export default function VendorReports() {
  const [start, setStart] = useState(todayYmd());
  const [end, setEnd] = useState(todayYmd());
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(null);
  const [rows, setRows] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams({ start, end }).toString();
      const resSum = await fetch(`${API_URL}/api/vendor/tickets/summary?${qs}`, { headers: { ...authHeaders() } });
      const dataSum = await resSum.json().catch(() => ({}));
      if (!resSum.ok || !dataSum?.success) throw new Error(dataSum?.error || 'Gagal memuat summary.');

      const qs2 = new URLSearchParams({ start, end, ...(status ? { status } : {}) }).toString();
      const resRows = await fetch(`${API_URL}/api/vendor/tickets/vouchers?${qs2}`, { headers: { ...authHeaders() } });
      const dataRows = await resRows.json().catch(() => ({}));
      if (!resRows.ok || !dataRows?.success) throw new Error(dataRows?.error || 'Gagal memuat voucher list.');

      setSummary(dataSum.data);
      setRows(Array.isArray(dataRows?.data?.rows) ? dataRows.data.rows : []);
    } catch (e) {
      setSummary(null);
      setRows([]);
      setError(e?.message || 'Gagal memuat laporan.');
    } finally {
      setLoading(false);
    }
  }, [start, end, status]);

  useEffect(() => {
    // eslint-disable-next-line no-void
    void load();
  }, [load]);

  const stats = useMemo(() => ({
    sold_count: Number(summary?.sold_count) || 0,
    redeemed_count: Number(summary?.redeemed_count) || 0,
    active_count: Number(summary?.active_count) || 0,
    sold_amount: Number(summary?.sold_amount) || 0,
    redeemed_amount: Number(summary?.redeemed_amount) || 0,
  }), [summary]);

  const downloadCsv = () => {
    const csv = toCsv(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `voucher-report_${start}_to_${end}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black">Rekap & Rekonsiliasi</h1>
        <p className="text-sm font-bold text-slate-500">Laporan voucher berdasarkan tanggal kunjungan.</p>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <label className="block">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Start</div>
            <input value={start} onChange={(e) => setStart(e.target.value)} type="date" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-black text-slate-800 outline-none" />
          </label>
          <label className="block">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">End</div>
            <input value={end} onChange={(e) => setEnd(e.target.value)} type="date" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-black text-slate-800 outline-none" />
          </label>
          <label className="block">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Status</div>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-black text-slate-800 outline-none">
              <option value="">Semua</option>
              <option value="active">Active</option>
              <option value="used">Used</option>
            </select>
          </label>
          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="flex-1 px-4 py-3 rounded-2xl bg-slate-900 text-white font-black hover:bg-slate-800 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <RefreshCcw size={18} />}
              Refresh
            </button>
            <button
              type="button"
              onClick={downloadCsv}
              disabled={loading || rows.length === 0}
              className="px-4 py-3 rounded-2xl bg-white border border-slate-200 font-black text-slate-800 hover:bg-slate-50 disabled:opacity-60 flex items-center justify-center gap-2"
              title="Download CSV"
            >
              <Download size={18} />
            </button>
          </div>
        </div>

        {error ? (
          <div className="mt-4 bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-black flex items-start gap-2 border border-red-100">
            <XCircle size={18} className="shrink-0 mt-0.5" /> {error}
          </div>
        ) : null}

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sold</div>
            <div className="text-xl font-black text-slate-900 mt-1">{stats.sold_count}</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Redeemed</div>
            <div className="text-xl font-black text-slate-900 mt-1">{stats.redeemed_count}</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Active</div>
            <div className="text-xl font-black text-slate-900 mt-1">{stats.active_count}</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sold Amount</div>
            <div className="text-xl font-black text-slate-900 mt-1">Rp {stats.sold_amount.toLocaleString('id-ID')}</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Redeemed Amount</div>
            <div className="text-xl font-black text-slate-900 mt-1">Rp {stats.redeemed_amount.toLocaleString('id-ID')}</div>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-slate-400 font-black">
                <th className="py-3 pr-4">Voucher</th>
                <th className="py-3 pr-4">Produk</th>
                <th className="py-3 pr-4">Visit</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4">Harga</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.voucher_code} className="border-t border-slate-100">
                  <td className="py-3 pr-4 font-black text-slate-800 whitespace-nowrap">{r.voucher_code}</td>
                  <td className="py-3 pr-4">
                    <div className="font-black text-slate-900">{r.product_title}</div>
                    <div className="text-[11px] font-bold text-slate-500">{r.variant_name}</div>
                  </td>
                  <td className="py-3 pr-4 font-bold text-slate-700 whitespace-nowrap">{r.visit_date}</td>
                  <td className="py-3 pr-4 font-black text-slate-700 whitespace-nowrap">{r.status}</td>
                  <td className="py-3 pr-4 font-black text-slate-900 whitespace-nowrap">
                    Rp {(Number(r.variant_price) || 0).toLocaleString('id-ID')}
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm font-bold text-slate-500">
                    Tidak ada data pada rentang ini.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

