import React, { useState } from 'react';
import { Search, CheckCircle, CreditCard, ChevronDown, ChevronUp, Upload, Loader2 } from 'lucide-react';

const STATUS_MAP = {
  pending:  { label: 'Pending',   cls: 'bg-amber-50 text-amber-600 border-amber-200' },
  approved: { label: 'Approved',  cls: 'bg-blue-50 text-blue-600 border-blue-200' },
  paid:     { label: 'Dibayar',   cls: 'bg-green-50 text-green-600 border-green-200' }
};

const fmtRp = (n) => `Rp ${(n || 0).toLocaleString('id-ID')}`;
const fmtPct = (n) => `${((n || 0) * 100).toFixed(0)}%`;

// Sub-komponen form upload bukti payout — muncul inline saat klik "Konfirmasi Transfer"
const PayProofForm = ({ payoutId, onSubmit, onCancel }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fileName, setFileName] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const fd = new FormData();
    const fileInput = document.getElementById(`pay-proof-${payoutId}`);
    if (fileInput?.files[0]) fd.append('transfer_proof', fileInput.files[0]);
    const ok = await onSubmit(payoutId, fd);
    if (!ok) setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-blue-50 border border-blue-100 rounded-xl p-3 space-y-3">
      <p className="text-xs font-bold text-blue-700">Upload Bukti Transfer Payout</p>
      <label className="cursor-pointer group flex items-center gap-3 p-2.5 bg-white border border-blue-200 rounded-xl hover:border-blue-400 transition-colors">
        <input
          id={`pay-proof-${payoutId}`}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={(e) => setFileName(e.target.files[0]?.name || '')}
          className="hidden"
        />
        <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
          <Upload size={14} className="text-blue-400" />
        </div>
        <span className="text-xs text-slate-500 truncate">{fileName || 'Pilih file bukti...'}</span>
      </label>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 bg-blue-600 text-white font-bold py-2 rounded-xl text-xs hover:bg-blue-700 transition-colors disabled:opacity-50 flex justify-center items-center gap-1.5"
        >
          {isSubmitting ? <><Loader2 size={12} className="animate-spin" /> Memproses...</> : 'Konfirmasi Dibayar'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 bg-white border border-slate-200 text-slate-500 font-bold py-2 rounded-xl text-xs hover:bg-slate-50 transition-colors"
        >
          Batal
        </button>
      </div>
    </form>
  );
};

const VendorPayoutTable = ({ data, isLoading, onGenerate, onApprove, onMarkPaid }) => {
  const [expandedId, setExpandedId] = useState(null);
  const [showPayForm, setShowPayForm] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // State form generate payout
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [genPeriod, setGenPeriod] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end:   new Date().toISOString().split('T')[0]
  });

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
    setShowPayForm(null);
  };

  const handleMarkPaid = async (id, fd) => {
    const ok = await onMarkPaid(id, fd);
    if (ok) setShowPayForm(null);
    return ok;
  };

  const filtered = data.filter((p) => {
    const q = searchTerm.toLowerCase();
    const matchSearch = p.vendor_name?.toLowerCase().includes(q) || p.bank_account?.includes(q);
    const matchStatus = filterStatus === 'all' || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 text-center text-slate-400 font-bold">
        Memuat data payout vendor...
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* Toolbar: Search + Filter + Generate */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-3">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama vendor atau no. rekening..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
          >
            <option value="all">Semua Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="paid">Dibayar</option>
          </select>
          <button
            onClick={() => setShowGenerateForm((v) => !v)}
            className="px-4 py-2.5 bg-indigo-600 text-white font-bold text-sm rounded-xl hover:bg-indigo-700 shadow-sm transition-colors flex items-center gap-2 shrink-0"
          >
            ⚡ Generate Payout
          </button>
        </div>

        {/* Form Generate Payout */}
        {showGenerateForm && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex flex-wrap gap-3 items-end animate-in slide-in-from-top-2 fade-in duration-200">
            <div>
              <label className="block text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-1">Periode Mulai</label>
              <input
                type="date"
                value={genPeriod.start}
                onChange={(e) => setGenPeriod((p) => ({ ...p, start: e.target.value }))}
                className="p-2 bg-white border border-indigo-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-1">Periode Selesai</label>
              <input
                type="date"
                value={genPeriod.end}
                onChange={(e) => setGenPeriod((p) => ({ ...p, end: e.target.value }))}
                className="p-2 bg-white border border-indigo-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              onClick={async () => {
                const ok = await onGenerate(genPeriod.start, genPeriod.end);
                if (ok) setShowGenerateForm(false);
              }}
              className="px-4 py-2 bg-indigo-600 text-white font-bold text-sm rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
            >
              Generate Sekarang
            </button>
          </div>
        )}
      </div>

      {/* Kartu Payout */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 text-center text-slate-400 font-bold">
          {data.length === 0 ? 'Belum ada payout yang di-generate.' : 'Tidak ada data yang cocok.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((p) => {
            const isExpanded = expandedId === p.id;
            const statusInfo = STATUS_MAP[p.status] || STATUS_MAP.pending;

            return (
              <div key={p.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col hover:shadow-md transition-all">

                {/* Header Kartu */}
                <div
                  onClick={() => toggleExpand(p.id)}
                  className="p-4 cursor-pointer hover:bg-slate-50 flex items-center justify-between gap-3 transition-colors"
                >
                  <div className="overflow-hidden flex-1">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">Vendor</p>
                    <span className="font-black text-slate-800 text-sm truncate block">{p.vendor_name || '-'}</span>
                    <span className="text-[11px] text-slate-500">Komisi: {fmtPct(p.commission_rate)}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${statusInfo.cls}`}>
                      {statusInfo.label}
                    </span>
                    <div className="text-slate-400">
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>
                </div>

                {/* Accordion Body */}
                {isExpanded && (
                  <div className="border-t border-slate-100 animate-in slide-in-from-top-2 fade-in duration-200">
                    <div className="p-4 space-y-3">

                      {/* Periode */}
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Periode</p>
                        <p className="text-xs font-bold text-slate-700">
                          {p.period_start} → {p.period_end}
                        </p>
                      </div>

                      {/* Angka */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                          <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Gross Revenue</p>
                          <p className="text-sm font-black text-blue-700">{fmtRp(p.gross_revenue)}</p>
                        </div>
                        <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                          <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">Komisi ({fmtPct(p.commission_rate)})</p>
                          <p className="text-sm font-black text-emerald-700">{fmtRp(p.commission_amount)}</p>
                        </div>
                      </div>

                      {/* Info Rekening */}
                      {(p.bank_name || p.bank_account) && (
                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Rekening Tujuan</p>
                          <p className="text-xs font-bold text-slate-700">{p.bank_name || '-'}</p>
                          <p className="text-xs font-mono text-slate-500">{p.bank_account || '-'}</p>
                        </div>
                      )}

                      {/* Form bayar inline */}
                      {showPayForm === p.id ? (
                        <PayProofForm
                          payoutId={p.id}
                          onSubmit={handleMarkPaid}
                          onCancel={() => setShowPayForm(null)}
                        />
                      ) : null}
                    </div>

                    {/* Tombol Aksi */}
                    <div className="p-3 bg-slate-50 border-t border-slate-100 flex gap-2">
                      {p.status === 'pending' && (
                        <button
                          onClick={() => onApprove(p.id)}
                          className="flex-1 bg-blue-600 text-white font-bold py-2.5 rounded-xl text-xs hover:bg-blue-700 transition-colors flex justify-center items-center gap-1.5 shadow-sm"
                        >
                          <CheckCircle size={14} /> Approve
                        </button>
                      )}
                      {p.status === 'approved' && (
                        <button
                          onClick={() => setShowPayForm(showPayForm === p.id ? null : p.id)}
                          className="flex-1 bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-xs hover:bg-emerald-600 transition-colors flex justify-center items-center gap-1.5 shadow-sm"
                        >
                          <CreditCard size={14} /> Konfirmasi Transfer
                        </button>
                      )}
                      {p.status === 'paid' && p.transfer_proof && (
                        <a
                          href={p.transfer_proof}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 bg-white border border-slate-200 text-slate-600 font-bold py-2.5 rounded-xl text-xs hover:bg-slate-50 transition-colors flex justify-center items-center gap-1.5 shadow-sm"
                        >
                          📄 Lihat Bukti Transfer
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default VendorPayoutTable;
