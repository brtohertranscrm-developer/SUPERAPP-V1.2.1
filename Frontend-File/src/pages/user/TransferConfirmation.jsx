import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, Copy, CreditCard, Loader2, Upload } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL?.trim() || '';

const fmtRp = (value) => `Rp ${Number(value || 0).toLocaleString('id-ID')}`;

const CopyButton = ({ value }) => {
  const [copied, setCopied] = useState(false);
  const safe = String(value || '');

  const handleCopy = async () => {
    if (!safe) return;
    try {
      await navigator.clipboard.writeText(safe);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* ignore */
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 text-white font-black text-xs hover:bg-slate-700 transition-colors disabled:opacity-50"
      disabled={!safe}
      title="Copy"
    >
      <Copy size={14} /> {copied ? 'Tersalin' : 'Copy'}
    </button>
  );
};

export default function TransferConfirmation() {
  const navigate = useNavigate();
  const location = useLocation();

  const payload = location.state || null;
  const orderId = payload?.order_id || payload?.orderId || '';
  const itemName = payload?.item_name || payload?.itemName || 'Pesanan';
  const totalPrice = payload?.total_price ?? payload?.totalPrice ?? 0;
  const paymentMethod = payload?.payment_method || payload?.paymentMethod || 'transfer';

  const [paymentInfo, setPaymentInfo] = useState(null);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const [uploadErr, setUploadErr] = useState('');
  const [transferBank, setTransferBank] = useState('BCA');
  const [transferDate, setTransferDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [transferAmount, setTransferAmount] = useState(() => String(Number(totalPrice || 0)));

  useEffect(() => {
    if (!orderId) {
      navigate('/dashboard', { replace: true });
      return;
    }
    sessionStorage.setItem(
      'last_transfer_confirmation',
      JSON.stringify({ order_id: orderId, item_name: itemName, total_price: totalPrice, payment_method: paymentMethod })
    );
  }, [orderId, itemName, totalPrice, paymentMethod, navigate]);

  useEffect(() => {
    setLoadingInfo(true);
    fetch(`${API_URL}/api/payment-info`)
      .then((r) => r.json())
      .then((data) => { if (data?.success) setPaymentInfo(data.data); })
      .catch(() => {})
      .finally(() => setLoadingInfo(false));
  }, []);

  const selectedBank = useMemo(() => {
    const pm = String(paymentMethod || '').toLowerCase();
    if (pm.includes('mandiri')) return 'mandiri';
    return 'bca';
  }, [paymentMethod]);

  const bank = paymentInfo?.[selectedBank] || null;

  const handleUploadProof = async () => {
    setUploadMsg('');
    setUploadErr('');

    const input = document.getElementById('proof-file');
    const file = input?.files?.[0];
    if (!file) {
      setUploadErr('Silakan pilih file bukti transfer.');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setUploadErr('Sesi login berakhir. Silakan login ulang.');
      navigate('/login', { replace: true });
      return;
    }

    const fd = new FormData();
    fd.append('proof', file);
    fd.append('order_id', orderId);
    fd.append('bank_name', transferBank);
    fd.append('transfer_amount', transferAmount || String(Number(totalPrice || 0)));
    fd.append('transfer_date', transferDate);

    setIsUploading(true);
    try {
      const res = await fetch(`${API_URL}/api/users/payments/reconciliations`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || `HTTP ${res.status}`);
      setUploadMsg(data.message || 'Bukti berhasil diunggah.');
      input.value = '';
    } catch (e) {
      setUploadErr(e.message || 'Gagal mengunggah bukti.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-24 animate-fade-in-up">
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-emerald-600 text-white px-6 py-5 flex items-center gap-3">
            <div className="w-11 h-11 bg-white/15 rounded-2xl flex items-center justify-center">
              <CheckCircle2 size={22} />
            </div>
            <div>
              <div className="font-black text-lg leading-tight">Pesanan Dibuat</div>
              <div className="text-white/80 text-sm font-bold">Silakan selesaikan transfer bank untuk konfirmasi.</div>
            </div>
          </div>

          <div className="p-6 space-y-5">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Order ID</div>
              <div className="flex items-center justify-between gap-3">
                <div className="font-mono font-black text-slate-900">{orderId}</div>
                <CopyButton value={orderId} />
              </div>
              <div className="mt-3 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Tagihan</div>
              <div className="text-2xl font-black text-slate-900">{fmtRp(totalPrice)}</div>
              <div className="mt-1 text-xs text-slate-500 font-bold">{itemName}</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <CreditCard size={16} className="text-rose-500" />
                <div className="font-black text-slate-900">Instruksi Transfer</div>
              </div>

              {loadingInfo ? (
                <div className="flex items-center gap-2 text-slate-500 font-bold text-sm">
                  <Loader2 size={16} className="animate-spin" /> Memuat info rekening...
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rekening Tujuan</div>
                    <div className="mt-1 font-black text-slate-900 text-sm">
                      {bank?.number ? `${bank.number} (a/n ${bank.name || '-'})` : 'Rekening belum diset di server'}
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <CopyButton value={bank?.number || ''} />
                      <CopyButton value={fmtRp(totalPrice).replace('Rp ', '')} />
                    </div>
                    <div className="mt-2 text-[11px] text-slate-500 font-bold">
                      Copy nominal: tombol kedua akan menyalin angka tanpa "Rp".
                    </div>
                  </div>

                  <div className="text-xs text-slate-600 font-medium leading-relaxed">
                    Setelah transfer, tim admin akan memverifikasi secara manual. Status pesanan akan berubah setelah diverifikasi.
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Upload size={16} className="text-rose-500" />
                <div className="font-black text-slate-900">Upload Bukti Transfer</div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Bank</div>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 outline-none"
                    value={transferBank}
                    onChange={(e) => setTransferBank(e.target.value)}
                  >
                    <option value="BCA">BCA</option>
                    <option value="Mandiri">Mandiri</option>
                  </select>
                </div>
                <div className="sm:col-span-1">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tanggal Transfer</div>
                  <input
                    type="date"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 outline-none"
                    value={transferDate}
                    onChange={(e) => setTransferDate(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-1">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Nominal</div>
                  <input
                    type="number"
                    min="0"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 outline-none"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                  />
                </div>
              </div>

              <div className="mt-3">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">File Bukti (JPG/PNG/WebP/PDF)</div>
                <input
                  id="proof-file"
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.pdf"
                  className="block w-full text-sm font-bold text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-white hover:file:bg-slate-700"
                />
              </div>

              <button
                type="button"
                onClick={handleUploadProof}
                disabled={isUploading || !orderId}
                className="mt-4 w-full py-3.5 rounded-2xl bg-rose-500 text-white font-black hover:bg-rose-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isUploading ? <><Loader2 size={16} className="animate-spin" /> Mengunggah...</> : 'Upload Bukti Transfer'}
              </button>

              {uploadMsg && (
                <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-emerald-800 text-xs font-black">
                  {uploadMsg}
                </div>
              )}
              {uploadErr && (
                <div className="mt-3 bg-rose-50 border border-rose-200 rounded-2xl p-3 text-rose-800 text-xs font-black">
                  {uploadErr}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => navigate('/dashboard', { replace: true, state: { successMessage: `Pesanan ${orderId} berhasil dibuat. Menunggu konfirmasi pembayaran.` } })}
                className="flex-1 py-3.5 rounded-2xl bg-slate-900 text-white font-black hover:bg-slate-700 transition-colors"
              >
                Ke Dashboard
              </button>
              <button
                type="button"
                onClick={() => navigate('/trip-history', { replace: true })}
                className="flex-1 py-3.5 rounded-2xl bg-slate-100 text-slate-700 font-black hover:bg-slate-200 transition-colors"
              >
                Lihat Riwayat
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 text-center text-[11px] text-slate-400 font-bold">
          Jika kamu sudah transfer tapi status belum berubah, hubungi admin melalui menu Support.
        </div>
      </div>
    </div>
  );
}
