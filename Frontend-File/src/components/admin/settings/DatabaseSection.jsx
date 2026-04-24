import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bike,
  CalendarCheck,
  Check,
  Database,
  Download,
  HardDrive,
  Loader2,
  RefreshCw,
  Upload,
  Users,
} from 'lucide-react';
import { API_URL } from './settingsConstants';

export default function DatabaseSection({ token }) {
  const [dbInfo, setDbInfo] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreMsg, setRestoreMsg] = useState('');
  const [restoreErr, setRestoreErr] = useState('');
  const fileInputRef = useRef(null);

  const fetchDbInfo = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/database/info`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setDbInfo(data.data);
    } catch {
      // silent
    }
  };

  useEffect(() => { fetchDbInfo(); }, []);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/database/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { alert('Gagal mengekspor database.'); return; }

      const blob = await res.blob();
      const filename = res.headers.get('Content-Disposition')
        ?.split('filename=')[1]?.replace(/\"/g, '')
        || 'brother_trans_backup.db';

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Terjadi kesalahan saat export.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleRestore = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const confirm = window.confirm(
      '⚠️ PERHATIAN!\n\n' +
      'Proses restore akan MENGGANTI seluruh database saat ini dengan file yang kamu upload.\n\n' +
      'Backup otomatis akan dibuat sebelum restore.\n' +
      'Server akan restart otomatis setelah restore selesai.\n\n' +
      'Lanjutkan?'
    );
    if (!confirm) { e.target.value = ''; return; }

    setIsRestoring(true);
    setRestoreMsg('');
    setRestoreErr('');

    try {
      const formData = new FormData();
      formData.append('database', file);

      const res = await fetch(`${API_URL}/api/admin/database/restore`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        setRestoreMsg(data.message);
        setTimeout(() => window.location.reload(), 4000);
      } else {
        setRestoreErr(data.error || 'Gagal merestore database.');
      }
    } catch {
      setRestoreErr('Terjadi kesalahan jaringan saat restore.');
    } finally {
      setIsRestoring(false);
      e.target.value = '';
    }
  };

  const fmtDate = (d) => (d
    ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—'
  );

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Database className="text-slate-700" size={20} /> Database Backup & Restore
        </h2>
        <button
          onClick={fetchDbInfo}
          className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-50 transition-colors"
          title="Refresh info"
          type="button"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {dbInfo && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { icon: HardDrive, label: 'Ukuran DB', value: `${dbInfo.size_mb} MB` },
            { icon: Users, label: 'Total User', value: `${dbInfo.users} akun` },
            { icon: CalendarCheck, label: 'Total Booking', value: `${dbInfo.bookings} order` },
            { icon: Bike, label: 'Total Motor', value: `${dbInfo.motors} unit` },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <div className="flex items-center gap-2 mb-1">
                <Icon size={14} className="text-slate-400" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
              </div>
              <p className="font-black text-slate-900 text-sm">{value}</p>
            </div>
          ))}
        </div>
      )}

      {dbInfo?.modified && (
        <p className="text-xs text-slate-400 font-medium mb-6">Terakhir dimodifikasi: {fmtDate(dbInfo.modified)}</p>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 bg-slate-900 hover:bg-slate-700 disabled:opacity-50 text-white font-black rounded-2xl text-sm transition-colors"
          type="button"
        >
          {isExporting
            ? <><Loader2 size={16} className="animate-spin" /> Mengekspor...</>
            : <><Download size={16} /> Download Backup DB</>
          }
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isRestoring}
          className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-black rounded-2xl text-sm transition-colors"
          type="button"
        >
          {isRestoring
            ? <><Loader2 size={16} className="animate-spin" /> Merestore...</>
            : <><Upload size={16} /> Restore dari File .db</>
          }
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".db,.sqlite"
          className="hidden"
          onChange={handleRestore}
        />
      </div>

      {restoreMsg && (
        <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
          <Check size={16} className="text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-black text-emerald-800">{restoreMsg}</p>
            <p className="text-xs text-emerald-600 mt-0.5">Halaman akan reload otomatis dalam beberapa detik...</p>
          </div>
        </div>
      )}
      {restoreErr && (
        <div className="mt-4 bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle size={16} className="text-rose-500 shrink-0 mt-0.5" />
          <p className="text-sm font-black text-rose-800">{restoreErr}</p>
        </div>
      )}

      <div className="mt-4 bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-start gap-3">
        <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700 font-medium leading-relaxed">
          <span className="font-black">Perhatian:</span> Restore akan mengganti seluruh data di server dengan file yang diupload.
          Backup otomatis dibuat sebelum restore. Pastikan file .db berasal dari backup Brothers Trans yang valid.
          Server akan restart otomatis setelah restore selesai.
        </p>
      </div>
    </div>
  );
}

