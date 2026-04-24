import React, { useEffect, useState } from 'react';
import { Clock, RefreshCw } from 'lucide-react';
import { API_URL } from './settingsConstants';

export default function MotorBillingSection({ token }) {
  const [settings, setSettings] = useState({
    motor_billing_mode: 'calendar',
    motor_threshold_12h: 12,
    updated_at: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [saveErr, setSaveErr] = useState('');

  const fetchSettings = async () => {
    setIsLoading(true);
    setSaveErr('');
    try {
      const res = await fetch(`${API_URL}/api/admin/settings/motor-billing`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data?.success && data?.data) {
        setSettings({
          motor_billing_mode: data.data.motor_billing_mode || 'calendar',
          motor_threshold_12h: Number(data.data.motor_threshold_12h) || 12,
          updated_at: data.data.updated_at || null,
        });
      } else {
        setSaveErr(data?.error || 'Gagal memuat pengaturan billing motor.');
      }
    } catch {
      setSaveErr('Gagal memuat pengaturan billing motor.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchSettings(); }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMsg('');
    setSaveErr('');
    try {
      const res = await fetch(`${API_URL}/api/admin/settings/motor-billing`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          motor_billing_mode: settings.motor_billing_mode,
          motor_threshold_12h: settings.motor_threshold_12h,
        }),
      });
      const data = await res.json();
      if (data?.success) {
        setSaveMsg(data.message || 'Tersimpan.');
        fetchSettings();
      } else {
        setSaveErr(data?.error || 'Gagal menyimpan pengaturan.');
      }
    } catch {
      setSaveErr('Gagal menyimpan pengaturan.');
    } finally {
      setIsSaving(false);
    }
  };

  const fmtDate = (d) => (d
    ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—'
  );

  const mode = settings.motor_billing_mode;

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Clock className="text-slate-700" size={20} /> Aturan Billing Motor (12 Jam / 24 Jam)
        </h2>
        <button
          onClick={fetchSettings}
          className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-50 transition-colors"
          title="Refresh setting"
          disabled={isLoading}
          type="button"
        >
          <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Mode Hitung</div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSettings((s) => ({ ...s, motor_billing_mode: 'calendar' }))}
              className={`flex-1 px-4 py-3 rounded-xl font-black text-sm border transition-colors ${
                mode === 'calendar'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
              }`}
            >
              Per Kalender
            </button>
            <button
              type="button"
              onClick={() => setSettings((s) => ({ ...s, motor_billing_mode: 'stopwatch' }))}
              className={`flex-1 px-4 py-3 rounded-xl font-black text-sm border transition-colors ${
                mode === 'stopwatch'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
              }`}
            >
              Stopwatch (Durasi)
            </button>
          </div>

          <div className="mt-3 text-xs text-slate-600 font-medium leading-relaxed">
            {mode === 'calendar'
              ? 'Per Kalender: setiap tanggal dihitung terpisah (misal 23:00–23:59 tetap kena paket 12 jam pada tanggal itu).'
              : 'Stopwatch: dihitung dari selisih durasi total (misal 25 jam → 1×24 jam + 1×12 jam, tergantung threshold).'}
          </div>
        </div>

        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Threshold Paket 12 Jam</div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={1}
              max={23}
              value={settings.motor_threshold_12h}
              onChange={(e) => setSettings((s) => ({ ...s, motor_threshold_12h: parseInt(e.target.value, 10) || 12 }))}
              className="w-28 bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-brand-primary font-black text-slate-900"
            />
            <div className="text-xs text-slate-600 font-medium">
              Jika pemakaian &le; threshold jam, sistem akan pakai paket 12 jam.
            </div>
          </div>

          <div className="mt-3 text-[11px] text-slate-500 font-bold">
            Terakhir update: {fmtDate(settings.updated_at)}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || isLoading}
          className="px-5 py-3.5 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-black rounded-2xl text-sm transition-colors"
        >
          {isSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}
        </button>

        <div className="flex-1">
          {saveMsg && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-emerald-800 text-xs font-black">
              {saveMsg}
            </div>
          )}
          {saveErr && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 text-rose-800 text-xs font-black">
              {saveErr}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

