import React, { useState, useEffect } from 'react';
import {
  Star, CheckCircle2, XCircle, Eye, Loader2,
  Clock, RefreshCw, ExternalLink
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

const STATUS_BADGE = {
  pending:  { label: 'Menunggu',  cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  approved: { label: 'Disetujui', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  rejected: { label: 'Ditolak',   cls: 'bg-rose-50 text-rose-700 border-rose-200' },
};

// Modal preview screenshot
const PreviewModal = ({ url, onClose }) => (
  <div
    className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4"
    onClick={onClose}
  >
    <div className="relative max-w-2xl w-full" onClick={e => e.stopPropagation()}>
      <button
        onClick={onClose}
        className="absolute -top-10 right-0 text-white/70 hover:text-white font-bold text-sm flex items-center gap-1"
      >
        <XCircle size={16} /> Tutup
      </button>
      <img src={url} alt="Screenshot review" className="w-full rounded-2xl shadow-2xl" />
    </div>
  </div>
);

// Modal reject dengan alasan
const RejectModal = ({ onConfirm, onClose, isLoading }) => {
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6">
        <h3 className="font-black text-slate-900 mb-1">Tolak Review</h3>
        <p className="text-xs text-slate-500 mb-4">Berikan alasan penolakan agar user bisa submit ulang.</p>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Contoh: Screenshot tidak terlihat jelas, nama akun tidak tampak..."
          rows={3}
          className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-rose-400 resize-none mb-4"
        />
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={() => onConfirm(reason || 'Screenshot tidak memenuhi syarat.')}
            disabled={isLoading}
            className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 text-white font-black rounded-xl text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
            Tolak
          </button>
        </div>
      </div>
    </div>
  );
};

export default function GmapsReviewTable() {
  const [reviews, setReviews]           = useState([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [filterStatus, setFilterStatus] = useState('pending');
  const [previewUrl, setPreviewUrl]     = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [actionLoading, setActionLoading] = useState(null); // id yang sedang diproses

  const token = localStorage.getItem('token');

  const fetchReviews = async () => {
    setIsLoading(true);
    try {
      const res  = await fetch(`${API_URL}/api/admin/gmaps-reviews?status=${filterStatus}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setReviews(data.data);
    } catch (err) {
      console.error('Gagal fetch reviews:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchReviews(); }, [filterStatus]);

  const handleApprove = async (id) => {
    if (!window.confirm('Approve review ini dan berikan +50 Miles ke user?')) return;
    setActionLoading(id);
    try {
      const res  = await fetch(`${API_URL}/api/admin/gmaps-reviews/${id}/approve`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.success) {
        fetchReviews();
      } else {
        alert('Gagal approve: ' + data.error);
      }
    } catch {
      alert('Terjadi kesalahan jaringan.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id, reason) => {
    setActionLoading(id);
    try {
      const res  = await fetch(`${API_URL}/api/admin/gmaps-reviews/${id}/reject`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (data.success) {
        setRejectTarget(null);
        fetchReviews();
      } else {
        alert('Gagal reject: ' + data.error);
      }
    } catch {
      alert('Terjadi kesalahan jaringan.');
    } finally {
      setActionLoading(null);
    }
  };

  const fmtDate = (d) => d
    ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';

  return (
    <>
      {/* Filter tabs + refresh */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex gap-2 bg-slate-100 rounded-xl p-1">
          {[
            { v: 'pending',  l: 'Menunggu' },
            { v: 'approved', l: 'Disetujui' },
            { v: 'rejected', l: 'Ditolak' },
            { v: 'all',      l: 'Semua' },
          ].map(({ v, l }) => (
            <button
              key={v}
              onClick={() => setFilterStatus(v)}
              className={`px-4 py-2 rounded-lg text-xs font-black transition-colors ${
                filterStatus === v
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
        <button
          onClick={fetchReviews}
          className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 border border-slate-200 px-3 py-2 rounded-xl transition-colors"
        >
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Tabel */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
            <Loader2 size={20} className="animate-spin" />
            <span className="text-sm font-medium">Memuat data...</span>
          </div>
        ) : reviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-3">
              <Star size={24} className="text-slate-300" />
            </div>
            <p className="text-sm font-black text-slate-500">Tidak ada submission</p>
            <p className="text-xs text-slate-400 mt-1">
              {filterStatus === 'pending' ? 'Belum ada review yang menunggu verifikasi.' : 'Tidak ada data dengan filter ini.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">User</th>
                  <th className="text-left px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Order</th>
                  <th className="text-left px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Screenshot</th>
                  <th className="text-left px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Waktu Submit</th>
                  <th className="text-left px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="text-center px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {reviews.map((r) => {
                  const badge    = STATUS_BADGE[r.status] || STATUS_BADGE.pending;
                  const isActive = actionLoading === r.id;

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* User */}
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-900 text-sm">{r.user_name || '—'}</p>
                        <p className="text-xs text-slate-400 font-medium">{r.user_phone || '—'}</p>
                      </td>

                      {/* Order */}
                      <td className="px-5 py-4">
                        <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded-lg">
                          {r.order_id || '—'}
                        </span>
                      </td>

                      {/* Screenshot */}
                      <td className="px-5 py-4">
                        {r.screenshot_url ? (
                          <div className="flex items-center gap-2">
                            <img
                              src={r.screenshot_url}
                              alt="preview"
                              className="w-12 h-12 object-cover rounded-xl border border-slate-200 cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => setPreviewUrl(r.screenshot_url)}
                            />
                            <div className="flex flex-col gap-1">
                              <button
                                onClick={() => setPreviewUrl(r.screenshot_url)}
                                className="flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-slate-900 transition-colors"
                              >
                                <Eye size={11} /> Preview
                              </button>
                              <a
                                href={r.screenshot_url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 text-[10px] font-bold text-blue-500 hover:text-blue-700 transition-colors"
                              >
                                <ExternalLink size={11} /> Buka
                              </a>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>

                      {/* Waktu */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                          <Clock size={11} className="shrink-0" />
                          {fmtDate(r.submitted_at)}
                        </div>
                        {r.reviewed_at && (
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Ditinjau: {fmtDate(r.reviewed_at)}
                          </p>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-1 rounded-lg border ${badge.cls}`}>
                          {r.status === 'approved' && <CheckCircle2 size={10} />}
                          {r.status === 'rejected' && <XCircle size={10} />}
                          {r.status === 'pending'  && <Clock size={10} />}
                          {badge.label}
                        </span>
                        {r.status === 'rejected' && r.reject_reason && (
                          <p className="text-[10px] text-slate-400 mt-1 max-w-[160px] truncate" title={r.reject_reason}>
                            {r.reject_reason}
                          </p>
                        )}
                        {r.status === 'approved' && (
                          <p className="text-[10px] text-emerald-600 font-bold mt-1">+{r.miles_awarded} Miles</p>
                        )}
                      </td>

                      {/* Aksi */}
                      <td className="px-5 py-4">
                        {r.status === 'pending' ? (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleApprove(r.id)}
                              disabled={isActive}
                              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[10px] rounded-xl transition-colors disabled:opacity-50 uppercase"
                            >
                              {isActive ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
                              Approve
                            </button>
                            <button
                              onClick={() => setRejectTarget(r.id)}
                              disabled={isActive}
                              className="flex items-center gap-1.5 px-3 py-2 bg-rose-500 hover:bg-rose-600 text-white font-black text-[10px] rounded-xl transition-colors disabled:opacity-50 uppercase"
                            >
                              <XCircle size={11} /> Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 text-center block">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal preview */}
      {previewUrl && <PreviewModal url={previewUrl} onClose={() => setPreviewUrl(null)} />}

      {/* Modal reject */}
      {rejectTarget && (
        <RejectModal
          onConfirm={(reason) => handleReject(rejectTarget, reason)}
          onClose={() => setRejectTarget(null)}
          isLoading={actionLoading === rejectTarget}
        />
      )}
    </>
  );
}
