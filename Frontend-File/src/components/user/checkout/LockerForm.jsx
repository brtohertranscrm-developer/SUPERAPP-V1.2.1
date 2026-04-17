import React from 'react';
import { Clock, Truck, Package, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

const fmtRp = (n) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;

const DURATION_PRESETS = [
  { label: '3 jam', hours: 3 },
  { label: '6 jam', hours: 6 },
  { label: '12 jam', hours: 12 },
  { label: '1 hari', hours: 24 },
  { label: '2 hari', hours: 48 }
];

const LockerForm = ({
  locker,
  addons = { pickup: [], drop: [] },
  form,
  updateForm,
  setDuration,
  pricing,
  MIN_HOURS = 3
}) => {
  if (!locker) return null;

  const selectedPickup = addons.pickup.find(a => a.id === form.pickup_addon_id);
  const selectedDrop   = addons.drop.find(a   => a.id === form.drop_addon_id);

  return (
    <div className="space-y-5">

      {/* Tanggal & Jam Mulai */}
      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Waktu Mulai</label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Tanggal</label>
            <input
              type="date"
              value={form.start_date}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => updateForm('start_date', e.target.value)}
              className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Jam</label>
            <input
              type="time"
              value={form.start_time}
              onChange={(e) => updateForm('start_time', e.target.value)}
              className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Pilih Durasi */}
      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
          Durasi Penyimpanan <span className="text-slate-400 font-normal normal-case">(min. {MIN_HOURS} jam)</span>
        </label>

        {/* Preset Durasi */}
        <div className="flex flex-wrap gap-2 mb-3">
          {DURATION_PRESETS.map(({ label, hours }) => (
            <button
              key={hours}
              type="button"
              onClick={() => setDuration(hours)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                form.duration_hours === hours
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Input Manual */}
        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3">
          <Clock size={18} className="text-slate-400 shrink-0" />
          <input
            type="number"
            value={form.duration_hours}
            onChange={(e) => setDuration(e.target.value)}
            min={MIN_HOURS}
            className="flex-1 bg-transparent text-sm font-bold text-slate-700 focus:outline-none"
          />
          <span className="text-sm text-slate-400 shrink-0">jam</span>
          <div className="flex flex-col gap-0.5">
            <button type="button" onClick={() => setDuration(form.duration_hours + 1)}
              className="text-slate-400 hover:text-blue-500 transition-colors"><ChevronUp size={16} /></button>
            <button type="button" onClick={() => setDuration(form.duration_hours - 1)}
              className="text-slate-400 hover:text-blue-500 transition-colors"><ChevronDown size={16} /></button>
          </div>
        </div>

        {form.duration_hours < MIN_HOURS && (
          <div className="flex items-center gap-2 mt-2 text-amber-600 text-xs">
            <AlertCircle size={14} />
            <span className="font-bold">Minimal penyimpanan {MIN_HOURS} jam</span>
          </div>
        )}
      </div>

      {/* Addon Pickup */}
      {addons.pickup.length > 0 && (
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
            Layanan Pickup <span className="text-slate-400 font-normal normal-case">(Ambil barang ke lokasi kamu — opsional)</span>
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-3 p-3 bg-white border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-slate-300 transition-colors">
              <input type="radio" name="pickup" value=""
                checked={!form.pickup_addon_id}
                onChange={() => updateForm('pickup_addon_id', null)}
                className="shrink-0" />
              <span className="text-sm text-slate-500">Tidak perlu pickup — saya akan datang sendiri</span>
            </label>
            {addons.pickup.map((a) => (
              <label key={a.id} className={`flex items-center gap-3 p-3 bg-white border-2 rounded-xl cursor-pointer transition-colors ${
                form.pickup_addon_id === a.id ? 'border-purple-400 bg-purple-50/40' : 'border-slate-200 hover:border-slate-300'
              }`}>
                <input type="radio" name="pickup" value={a.id}
                  checked={form.pickup_addon_id === a.id}
                  onChange={() => updateForm('pickup_addon_id', a.id)}
                  className="shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-700">{a.name}</p>
                  {a.description && <p className="text-[11px] text-slate-400">{a.description}</p>}
                </div>
                <span className="text-sm font-black text-purple-600 shrink-0">{fmtRp(a.price)}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Addon Drop */}
      {addons.drop.length > 0 && (
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
            Layanan Drop <span className="text-slate-400 font-normal normal-case">(Antar barang ke lokasi kamu — opsional)</span>
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-3 p-3 bg-white border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-slate-300 transition-colors">
              <input type="radio" name="drop" value=""
                checked={!form.drop_addon_id}
                onChange={() => updateForm('drop_addon_id', null)}
                className="shrink-0" />
              <span className="text-sm text-slate-500">Tidak perlu drop — saya akan ambil sendiri</span>
            </label>
            {addons.drop.map((a) => (
              <label key={a.id} className={`flex items-center gap-3 p-3 bg-white border-2 rounded-xl cursor-pointer transition-colors ${
                form.drop_addon_id === a.id ? 'border-orange-400 bg-orange-50/40' : 'border-slate-200 hover:border-slate-300'
              }`}>
                <input type="radio" name="drop" value={a.id}
                  checked={form.drop_addon_id === a.id}
                  onChange={() => updateForm('drop_addon_id', a.id)}
                  className="shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-700">{a.name}</p>
                  {a.description && <p className="text-[11px] text-slate-400">{a.description}</p>}
                </div>
                <span className="text-sm font-black text-orange-600 shrink-0">{fmtRp(a.price)}</span>
              </label>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

export default LockerForm;
