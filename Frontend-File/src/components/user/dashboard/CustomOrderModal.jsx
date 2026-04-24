import React, { useState } from 'react';
import { X, Loader2, Truck, MapPin, Calendar, FileText, CheckCircle2, AlertTriangle } from 'lucide-react';
import { WA_CONTACTS } from '../../../config/contacts';

const CITY_OTHER = 'Kota lainnya';
const BASE_CITIES = ['Yogyakarta', 'Solo', 'Semarang', 'Magelang', 'Klaten'];

const todayYmd = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const tomorrowYmd = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const dayDiff = (a, b) => {
  if (!a || !b) return 0;
  return Math.round((new Date(b) - new Date(a)) / 86400000);
};

const fmtDate = (v) => {
  if (!v) return '';
  return new Date(v).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
};

const API_URL = import.meta.env.VITE_API_URL?.trim() || '';

export default function CustomOrderModal({ user, onClose }) {
  const [step, setStep] = useState('form'); // 'form' | 'success'
  const [saving, setSaving] = useState(false);
  const [backendNotice, setBackendNotice] = useState(null); // string | null

  const cityOptions = Array.from(new Set([...BASE_CITIES, CITY_OTHER]));
  const resolveCity = (selected, other) => {
    if (selected === CITY_OTHER) return String(other || '').trim();
    return String(selected || '').trim();
  };

  const initialToCityInList = user?.location && BASE_CITIES.includes(user.location);
  const [form, setForm] = useState({
    unit_type: '',
    from_city: '',
    from_city_other: '',
    to_city: initialToCityInList ? user.location : (user?.location ? CITY_OTHER : ''),
    to_city_other: initialToCityInList ? '' : (user?.location || ''),
    start_date: tomorrowYmd(),
    end_date: '',
    notes: '',
  });
  const [errors, setErrors] = useState({});

  const duration = dayDiff(form.start_date, form.end_date);

  const validate = () => {
    const e = {};
    const fromCity = resolveCity(form.from_city, form.from_city_other);
    const toCity = resolveCity(form.to_city, form.to_city_other);

    if (!form.unit_type.trim()) e.unit_type = 'Wajib diisi.';
    if (!form.from_city) e.from_city = 'Pilih kota asal unit.';
    if (form.from_city === CITY_OTHER && !fromCity) e.from_city_other = 'Tulis nama kota asal.';
    if (!form.to_city) e.to_city = 'Pilih kota tujuan.';
    if (form.to_city === CITY_OTHER && !toCity) e.to_city_other = 'Tulis nama kota tujuan.';
    if (fromCity && toCity && fromCity === toCity) e.to_city = 'Kota tujuan harus berbeda dari kota asal.';
    if (!form.start_date) e.start_date = 'Wajib diisi.';
    if (form.start_date <= todayYmd()) e.start_date = 'Booking minimal H-1 (mulai besok).';
    if (!form.end_date) e.end_date = 'Wajib diisi.';
    if (duration < 3) e.end_date = `Minimal 3 hari sewa (sekarang ${duration} hari).`;
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const e_ = validate();
    if (Object.keys(e_).length > 0) { setErrors(e_); return; }
    setErrors({});
    setSaving(true);
    setBackendNotice(null);

    const fromCity = resolveCity(form.from_city, form.from_city_other);
    const toCity = resolveCity(form.to_city, form.to_city_other);

    try {
      const token = localStorage.getItem('token');
      const resp = await fetch(`${API_URL}/api/custom-orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          user_name: user?.name || null,
          user_phone: user?.phone || null,
          unit_type: form.unit_type.trim(),
          from_city: fromCity,
          to_city: toCity,
          start_date: form.start_date,
          end_date: form.end_date,
          notes: form.notes.trim() || null,
        }),
      });
      if (!resp.ok) {
        let msg = 'Permintaan berhasil dikirim ke admin via WA, tapi gagal tersimpan otomatis di sistem.';
        try {
          const data = await resp.json();
          if (data?.error) msg = `${msg} (${data.error})`;
        } catch {}
        setBackendNotice(msg);
      }
    } catch {
      // tetap lanjut ke WA meski backend gagal
      setBackendNotice('Permintaan berhasil dikirim ke admin via WA, tapi server sedang tidak bisa dihubungi (gagal tersimpan otomatis).');
    }

    // Notif admin via WA
    const waText = encodeURIComponent(
      `🛵 *PERMINTAAN UNIT ANTAR KOTA*\n\n` +
      `Nama: ${user?.name || 'Pelanggan'}\n` +
      `Kontak: ${user?.phone || '-'}\n\n` +
      `Unit: ${form.unit_type}\n` +
      `Dari kota: ${fromCity}\n` +
      `Tujuan: ${toCity}\n` +
      `Mulai: ${fmtDate(form.start_date)}\n` +
      `Selesai: ${fmtDate(form.end_date)} (${duration} hari)\n` +
      (form.notes ? `\nCatatan: ${form.notes}` : '') +
      `\n\nMohon konfirmasi ketersediaan dan total biaya ya kak. Terima kasih!`
    );
    window.open(`https://wa.me/${WA_CONTACTS.SUPPORT_ADMIN.phone_wa}?text=${waText}`, '_blank');

    setSaving(false);
    setStep('success');
  };

  const set = (key, val) => {
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((e) => { const ne = { ...e }; delete ne[key]; return ne; });
  };

  if (step === 'success') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl p-8 text-center animate-fade-in-up">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-emerald-500" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">Request Terkirim!</h2>
          <p className="text-slate-500 text-sm font-medium leading-relaxed mb-2">
            Permintaan kamu sudah kami catat dan WA ke admin. Tim kami akan konfirmasi ketersediaan unit dan biaya pengiriman secepatnya.
          </p>
          <p className="text-xs text-slate-400 font-medium mb-6">
            Pastikan WA kamu aktif untuk menerima konfirmasi dari admin Brother Trans.
          </p>
          {backendNotice && (
            <div className="mb-6 text-left rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-xs font-bold text-amber-800 leading-relaxed">{backendNotice}</p>
            </div>
          )}
          <button
            onClick={onClose}
            className="w-full py-4 bg-slate-900 hover:bg-rose-500 text-white font-black rounded-2xl text-sm transition-colors"
          >
            Oke, Sip!
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl max-h-[92vh] flex flex-col animate-fade-in-up">

        {/* Handle mobile */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-black text-slate-900">Pesan Unit Antar Kota</h2>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Kami kirim unitnya ke kotamu</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 text-slate-400">
            <X size={20} />
          </button>
        </div>

        {/* Syarat info */}
        <div className="mx-6 mt-4 rounded-2xl bg-amber-50 border border-amber-100 px-4 py-3 flex gap-3 shrink-0">
          <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 font-medium leading-relaxed">
            <span className="font-black">Syarat:</span> Minimal 3 hari sewa · Booking H-1 · Full payment di muka · Cek ketersediaan dikonfirmasi admin via WA
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

          {/* Unit type */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
              Unit yang Dicari
            </label>
            <input
              value={form.unit_type}
              onChange={(e) => set('unit_type', e.target.value)}
              placeholder="Contoh: Vespa Primavera 150, Honda Scoopy..."
              className={`w-full border rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-slate-900 ${errors.unit_type ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
            />
            {errors.unit_type && <p className="mt-1 text-xs text-red-500 font-bold">{errors.unit_type}</p>}
          </div>

          {/* From → To city */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 flex items-center gap-1">
                <MapPin size={10} /> Kota Asal Unit
              </label>
              <select
                value={form.from_city}
                onChange={(e) => set('from_city', e.target.value)}
                className={`w-full border rounded-2xl px-4 py-3 text-sm font-bold outline-none bg-white focus:ring-2 focus:ring-slate-900 ${errors.from_city ? 'border-red-300' : 'border-slate-200'}`}
              >
                <option value="">Pilih kota</option>
                {cityOptions.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.from_city && <p className="mt-1 text-xs text-red-500 font-bold">{errors.from_city}</p>}
              {form.from_city === CITY_OTHER && (
                <>
                  <input
                    value={form.from_city_other}
                    onChange={(e) => set('from_city_other', e.target.value)}
                    placeholder="Tulis nama kota asal"
                    className={`mt-2 w-full border rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-slate-900 ${errors.from_city_other ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
                  />
                  {errors.from_city_other && <p className="mt-1 text-xs text-red-500 font-bold">{errors.from_city_other}</p>}
                </>
              )}
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 flex items-center gap-1">
                <Truck size={10} /> Dikirim ke Kota
              </label>
              <select
                value={form.to_city}
                onChange={(e) => set('to_city', e.target.value)}
                className={`w-full border rounded-2xl px-4 py-3 text-sm font-bold outline-none bg-white focus:ring-2 focus:ring-slate-900 ${errors.to_city ? 'border-red-300' : 'border-slate-200'}`}
              >
                <option value="">Pilih kota</option>
                {cityOptions.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.to_city && <p className="mt-1 text-xs text-red-500 font-bold">{errors.to_city}</p>}
              {form.to_city === CITY_OTHER && (
                <>
                  <input
                    value={form.to_city_other}
                    onChange={(e) => set('to_city_other', e.target.value)}
                    placeholder="Tulis nama kota tujuan"
                    className={`mt-2 w-full border rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-slate-900 ${errors.to_city_other ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
                  />
                  {errors.to_city_other && <p className="mt-1 text-xs text-red-500 font-bold">{errors.to_city_other}</p>}
                </>
              )}
            </div>
          </div>

          {/* Tanggal */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 flex items-center gap-1">
                <Calendar size={10} /> Mulai Sewa
              </label>
              <input
                type="date"
                value={form.start_date}
                min={tomorrowYmd()}
                onChange={(e) => set('start_date', e.target.value)}
                className={`w-full border rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-slate-900 ${errors.start_date ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
              />
              {errors.start_date && <p className="mt-1 text-xs text-red-500 font-bold">{errors.start_date}</p>}
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 flex items-center gap-1">
                <Calendar size={10} /> Selesai Sewa
              </label>
              <input
                type="date"
                value={form.end_date}
                min={form.start_date || tomorrowYmd()}
                onChange={(e) => set('end_date', e.target.value)}
                className={`w-full border rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-slate-900 ${errors.end_date ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
              />
              {errors.end_date && <p className="mt-1 text-xs text-red-500 font-bold">{errors.end_date}</p>}
            </div>
          </div>

          {/* Durasi indicator */}
          {duration > 0 && (
            <div className={`rounded-xl px-4 py-2 text-xs font-black flex items-center gap-2 ${
              duration >= 3 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
            }`}>
              {duration >= 3 ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
              {duration} hari sewa {duration < 3 ? '— minimal 3 hari' : '✓'}
            </div>
          )}

          {/* Catatan */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 flex items-center gap-1">
              <FileText size={10} /> Catatan Tambahan
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={3}
              placeholder="Alamat pengiriman, preferensi warna, atau informasi lain..."
              className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-slate-900 resize-none"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 pb-6 pt-3 border-t border-slate-100 shrink-0 space-y-2">
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={saving}
            className="w-full py-4 bg-slate-900 hover:bg-rose-500 text-white font-black rounded-2xl text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {saving ? <Loader2 className="animate-spin" size={18} /> : <Truck size={18} />}
            Kirim Request ke Admin
          </button>
          <p className="text-center text-[10px] text-slate-400 font-medium">
            Request dikirim ke admin via WhatsApp untuk konfirmasi ketersediaan
          </p>
        </div>
      </div>
    </div>
  );
}
