import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Loader2, Upload } from 'lucide-react';
import { usePayment } from '../../hooks/usePayment';

const parseBookingExpiry = (value) => {
  if (!value) return null;
  const raw = String(value).trim();

  // SQLite datetime('now') returns UTC as "YYYY-MM-DD HH:mm:ss".
  // Browsers parse that format as local time, so WIB users saw it as expired immediately.
  const sqliteUtcMatch = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(raw);
  const isoWithoutZoneMatch = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(raw);
  const normalized = sqliteUtcMatch
    ? `${raw.replace(' ', 'T')}Z`
    : isoWithoutZoneMatch
      ? `${raw}Z`
      : raw;

  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
};

export default function PaymentPage() {
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL?.trim() || '';
  const {
    user,
    orderData,
    paymentInfo,
    isLoading,
  } = usePayment();

  const [isUploading, setIsUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const [uploadErr, setUploadErr] = useState('');
  const [transferBank, setTransferBank] = useState('BCA');
  const [transferDate, setTransferDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [transferAmount, setTransferAmount] = useState('');
  // recon_status dari backend: 'pending' | 'matched' | 'rejected' | null
  const [reconStatus, setReconStatus] = useState(null);
  const [expiresLeftSec, setExpiresLeftSec] = useState(null);

  useEffect(() => {
    if (orderData?.total_price != null) {
      setTransferAmount(String(Number(orderData.total_price || 0)));
    }
    if (orderData?.recon_status) {
      setReconStatus(orderData.recon_status);
    }
  }, [orderData?.total_price, orderData?.recon_status]);

  useEffect(() => {
    const expRaw = orderData?.expires_at;
    const status = String(orderData?.status || '').toLowerCase();
    const pay = String(orderData?.payment_status || '').toLowerCase();
    if (!expRaw || status !== 'pending' || pay !== 'unpaid') {
      setExpiresLeftSec(null);
      return;
    }

    const exp = parseBookingExpiry(expRaw);
    if (!exp) {
      setExpiresLeftSec(null);
      return;
    }

    const tick = () => {
      const left = Math.floor((exp.getTime() - Date.now()) / 1000);
      setExpiresLeftSec(left);
    };

    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [orderData?.expires_at, orderData?.status, orderData?.payment_status]);

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
    fd.append('order_id', orderData?.order_id || '');
    fd.append('bank_name', transferBank);
    fd.append('transfer_amount', transferAmount || String(Number(orderData?.total_price || 0)));
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
      setReconStatus('pending');
      input.value = '';
    } catch (e) {
      setUploadErr(e.message || 'Gagal mengunggah bukti.');
    } finally {
      setIsUploading(false);
    }
  };

  // ==========================================
  // HALAMAN INSTRUKSI TRANSFER (Motor + Loker)
  // ==========================================
  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-light flex items-center justify-center p-6">
        <div className="flex items-center gap-2 text-brand-dark font-black">
          <Loader2 size={18} className="animate-spin text-brand-primary" /> Memuat...
        </div>
      </div>
    );
  }

  // usePayment akan redirect ke login jika user kosong, tapi kita tetap render fallback agar hooks tidak conditional
  if (!user) {
    return (
      <div className="min-h-screen bg-brand-light flex items-center justify-center p-6">
        <div className="text-slate-600 font-bold">Mengalihkan...</div>
      </div>
    );
  }

  return (
    <div className="py-12 bg-brand-light min-h-screen animate-fade-in-up">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-rose-900/5 border border-gray-100 overflow-hidden">
          <div className="p-5 sm:p-8 lg:p-10">
            <h1 className="text-2xl sm:text-3xl font-black text-brand-dark mb-2 tracking-tight flex items-center gap-2">
              <CreditCard size={22} className="text-brand-primary" /> Instruksi Transfer Bank
            </h1>
            <p className="text-gray-500 text-sm font-medium">
              Untuk saat ini pembayaran masih via transfer bank dan diverifikasi manual oleh admin.
            </p>

            {!orderData && (
              <div className="mt-8 text-sm font-bold text-rose-600">
                Data pesanan tidak ditemukan.
              </div>
            )}

            {orderData && (
              <div className="mt-8 space-y-4">
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5">
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Order ID</div>
                  <div className="font-mono font-black text-brand-dark">{orderData.order_id}</div>
                  <div className="mt-3 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Tagihan</div>
                  <div className="text-2xl font-black text-brand-dark">
                    Rp {Number(orderData.total_price || 0).toLocaleString('id-ID')}
                  </div>
                  <div className="mt-1 text-xs text-gray-500 font-bold">{orderData.item_name}</div>

                  {reconStatus !== 'pending' && reconStatus !== 'matched' && typeof expiresLeftSec === 'number' && (
                    <div className="mt-4">
                      {expiresLeftSec > 0 ? (
                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-800 text-sm font-bold">
                          Pesanan ini akan otomatis dibatalkan jika belum ada bukti transfer dalam{' '}
                          <span className="font-black">
                            {Math.floor(expiresLeftSec / 60)}:{String(expiresLeftSec % 60).padStart(2, '0')}
                          </span>
                          .
                        </div>
                      ) : (
                        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-rose-700 text-sm font-bold">
                          Waktu pembayaran sudah habis. Silakan buat pesanan baru dari katalog.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5">
                  <div className="text-sm font-black text-brand-dark mb-2">Rekening Tujuan</div>
                  <div className="space-y-2 text-sm font-bold text-gray-700">
                    <div>
                      <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">BCA</div>
                      <div>{paymentInfo?.bca?.number ? `${paymentInfo.bca.number} (a/n ${paymentInfo.bca.name || '-'})` : 'Belum diset'}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mandiri</div>
                      <div>{paymentInfo?.mandiri?.number ? `${paymentInfo.mandiri.number} (a/n ${paymentInfo.mandiri.name || '-'})` : 'Belum diset'}</div>
                    </div>
                  </div>
                  <div className="mt-3 text-[11px] font-bold text-gray-400">
                    Setelah transfer, status akan berubah setelah diverifikasi admin.
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Upload size={16} className="text-brand-primary" />
                    <div className="text-sm font-black text-brand-dark">Upload Bukti Transfer</div>
                  </div>

                  {/* Status banner jika sudah ada rekonsiliasi */}
                  {reconStatus === 'pending' && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-800 text-sm font-bold flex items-start gap-3">
                      <Loader2 size={18} className="animate-spin text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-black">Bukti sedang diverifikasi</div>
                        <div className="text-xs font-medium mt-0.5 text-amber-600">Tim admin akan mengkonfirmasi pembayaranmu secepatnya. Tidak perlu upload ulang.</div>
                      </div>
                    </div>
                  )}

                  {reconStatus === 'matched' && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-emerald-800 text-sm font-bold flex items-center gap-3">
                      <span className="text-xl">✅</span>
                      <div>
                        <div className="font-black">Pembayaran terverifikasi</div>
                        <div className="text-xs font-medium mt-0.5 text-emerald-600">Transfer sudah dikonfirmasi oleh admin.</div>
                      </div>
                    </div>
                  )}

                  {reconStatus === 'rejected' && (
                    <div className="mb-3 bg-rose-50 border border-rose-200 rounded-2xl p-3 text-rose-700 text-xs font-bold">
                      ⚠️ Bukti sebelumnya ditolak admin. Silakan upload ulang dengan bukti yang benar.
                    </div>
                  )}

                  {/* Form upload — tampil jika belum pending/matched */}
                  {reconStatus !== 'pending' && reconStatus !== 'matched' && (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Bank Pengirim</div>
                          <select
                            className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 font-bold text-gray-800 outline-none"
                            value={transferBank}
                            onChange={(e) => setTransferBank(e.target.value)}
                          >
                            <option value="BCA">BCA</option>
                            <option value="Mandiri">Mandiri</option>
                          </select>
                        </div>
                        <div>
                          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Tanggal Transfer</div>
                          <input
                            type="date"
                            className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 font-bold text-gray-800 outline-none"
                            value={transferDate}
                            onChange={(e) => setTransferDate(e.target.value)}
                          />
                        </div>
                        <div>
                          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Nominal</div>
                          <input
                            type="number"
                            min="0"
                            className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 font-bold text-gray-800 outline-none"
                            value={transferAmount}
                            onChange={(e) => setTransferAmount(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="mt-3">
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">File Bukti (JPG/PNG/WebP/PDF)</div>
                        <div className="bg-white border border-gray-200 rounded-xl px-3 py-2">
                          <input
                            id="proof-file"
                            type="file"
                            accept=".jpg,.jpeg,.png,.webp,.pdf"
                            className="block w-full text-sm font-bold text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-dark file:px-3 file:py-2 file:text-white hover:file:bg-slate-800"
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleUploadProof}
                        disabled={isUploading || !orderData?.order_id}
                        className="mt-4 w-full py-3.5 rounded-2xl bg-brand-primary text-white font-black hover:bg-brand-secondary transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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
                    </>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard', { replace: true })}
                    className="flex-1 py-3.5 rounded-2xl bg-brand-dark text-white font-black hover:bg-slate-800 transition-colors"
                  >
                    Ke Dashboard
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/trip-history', { replace: true })}
                    className="flex-1 py-3.5 rounded-2xl bg-gray-100 text-gray-700 font-black hover:bg-gray-200 transition-colors"
                  >
                    Lihat Riwayat
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
