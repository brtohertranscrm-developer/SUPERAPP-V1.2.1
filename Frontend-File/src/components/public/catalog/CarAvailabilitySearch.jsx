import React from 'react';
import { Calendar, Clock, MapPin, Search } from 'lucide-react';

export default function CarAvailabilitySearch({
  form,
  setForm,
  onSubmit,
  isLoading,
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="bg-white rounded-[2.5rem] p-5 sm:p-6 shadow-sm border border-slate-100 -mt-10 relative z-20"
    >
      <div className="flex flex-col lg:flex-row lg:items-end gap-4">
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <label className="block">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-2">
              <MapPin size={14} /> Kota Pickup
            </div>
            <select
              value={form.pickupCity}
              onChange={(e) => setForm((p) => ({ ...p, pickupCity: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 outline-none font-black text-slate-800"
            >
              <option>Yogyakarta</option>
              <option>Solo</option>
              <option>Semarang</option>
            </select>
          </label>

          <label className="block">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-2">
              <Calendar size={14} /> Tanggal Pickup
            </div>
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 outline-none font-black text-slate-800"
              required
            />
          </label>

          <label className="block">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-2">
              <Clock size={14} /> Jam Pickup
            </div>
            <input
              type="time"
              value={form.startTime}
              onChange={(e) => setForm((p) => ({ ...p, startTime: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 outline-none font-black text-slate-800"
              required
            />
          </label>

          <label className="block">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-2">
              <Calendar size={14} /> Tanggal Kembali
            </div>
            <input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 outline-none font-black text-slate-800"
              required
            />
          </label>

          <label className="block">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-2">
              <Clock size={14} /> Jam Kembali
            </div>
            <input
              type="time"
              value={form.endTime}
              onChange={(e) => setForm((p) => ({ ...p, endTime: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 outline-none font-black text-slate-800"
              required
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full lg:w-auto px-7 py-4 rounded-2xl bg-rose-500 text-white font-black shadow-lg shadow-rose-500/20 hover:bg-rose-600 transition flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <Search size={18} /> {isLoading ? 'Mencari...' : 'Cek Ketersediaan'}
        </button>
      </div>

      <div className="mt-4 text-xs text-slate-500 font-medium">
        Mobil bisa diantar lintas kota. Jika unit berada di kota lain, admin akan atur reposisi setelah booking.
      </div>
    </form>
  );
}

