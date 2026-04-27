import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL?.trim() || '';

const authHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const cleanCode = (v) => String(v || '').trim().toUpperCase().replace(/\s+/g, '');

export default function VendorTickets() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [voucher, setVoucher] = useState(null);
  const [redeemOk, setRedeemOk] = useState(false);

  const canRedeem = useMemo(() => {
    const st = String(voucher?.status || '').toLowerCase();
    return !!voucher && st === 'active';
  }, [voucher]);

  const fetchVoucher = useCallback(async (c) => {
    const vcode = cleanCode(c);
    if (!vcode) return;
    setLoading(true);
    setError('');
    setRedeemOk(false);
    try {
      const res = await fetch(`${API_URL}/api/vendor/tickets/vouchers/${encodeURIComponent(vcode)}`, {
        headers: { ...authHeaders() },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) throw new Error(data?.error || 'Voucher tidak ditemukan.');
      setVoucher(data.data);
    } catch (e) {
      setVoucher(null);
      setError(e?.message || 'Gagal mencari voucher.');
    } finally {
      setLoading(false);
    }
  }, []);

  const redeem = useCallback(async () => {
    const vcode = cleanCode(code || voucher?.voucher_code);
    if (!vcode) return;
    setLoading(true);
    setError('');
    setRedeemOk(false);
    try {
      const res = await fetch(`${API_URL}/api/vendor/tickets/vouchers/${encodeURIComponent(vcode)}/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ notes: null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) throw new Error(data?.error || 'Gagal redeem voucher.');
      setVoucher(data.data);
      setRedeemOk(true);
    } catch (e) {
      setError(e?.message || 'Gagal redeem.');
    } finally {
      setLoading(false);
    }
  }, [code, voucher]);

  useEffect(() => {
    // auto lookup if URL contains ?code=
    const params = new URLSearchParams(window.location.search);
    const q = params.get('code');
    if (q) {
      setCode(q);
      // eslint-disable-next-line no-void
      void fetchVoucher(q);
    }
  }, [fetchVoucher]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black">Konfirmasi Voucher</h1>
        <p className="text-sm font-bold text-slate-500">Masukkan kode voucher dari customer untuk cek status dan redeem.</p>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5 md:p-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            // eslint-disable-next-line no-void
            void fetchVoucher(code);
          }}
          className="flex flex-col md:flex-row gap-3"
        >
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 font-black text-slate-800 outline-none"
            placeholder="Contoh: BTX-123456-AB12CD34"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-4 rounded-2xl bg-slate-900 text-white font-black hover:bg-slate-800 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
            Cek
          </button>
        </form>

        {error ? (
          <div className="mt-4 bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-black flex items-start gap-2 border border-red-100">
            <XCircle size={18} className="shrink-0 mt-0.5" /> {error}
          </div>
        ) : null}

        {redeemOk ? (
          <div className="mt-4 bg-emerald-50 text-emerald-700 p-4 rounded-2xl text-sm font-black flex items-start gap-2 border border-emerald-100">
            <CheckCircle2 size={18} className="shrink-0 mt-0.5" /> Voucher berhasil diredeem.
          </div>
        ) : null}

        {voucher ? (
          <div className="mt-6 border-t border-slate-100 pt-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div>
                <div className="text-xs font-black text-slate-400 uppercase tracking-widest">Voucher</div>
                <div className="text-lg font-black text-slate-900">{voucher.voucher_code}</div>
                <div className="mt-1 text-sm font-bold text-slate-600">
                  {voucher.product_title} • {voucher.variant_name}
                </div>
                <div className="mt-1 text-xs font-bold text-slate-500">
                  Visit date: <span className="font-black text-slate-700">{voucher.visit_date}</span>
                </div>
                <div className="mt-1 text-xs font-bold text-slate-500">
                  Status: <span className="font-black text-slate-700">{voucher.status}</span>
                  {voucher.used_at ? <span className="text-slate-400"> • used_at: {voucher.used_at}</span> : null}
                </div>
              </div>

              <div className="md:text-right">
                <div className="text-xs font-black text-slate-400 uppercase tracking-widest">Harga</div>
                <div className="text-lg font-black text-slate-900">
                  Rp {(Number(voucher.variant_price) || 0).toLocaleString('id-ID')}
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => fetchVoucher(voucher.voucher_code)}
                disabled={loading}
                className="px-6 py-4 rounded-2xl bg-white border border-slate-200 font-black text-slate-800 hover:bg-slate-50 disabled:opacity-60"
              >
                Refresh Status
              </button>
              <button
                type="button"
                onClick={redeem}
                disabled={loading || !canRedeem}
                className="px-6 py-4 rounded-2xl bg-rose-500 text-white font-black hover:bg-rose-600 disabled:opacity-60"
              >
                Redeem Voucher
              </button>
            </div>

            <div className="mt-3 text-[11px] text-slate-500 font-semibold">
              Catatan: redeem hanya valid untuk tanggal kunjungan hari ini (sesuai sistem).
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

