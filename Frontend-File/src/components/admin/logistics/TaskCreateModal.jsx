import React from 'react';
import { Loader2, Plus, X } from 'lucide-react';

export default function TaskCreateModal({
  isOpen,
  onClose,
  title,
  editId,
  handleCreate,
  form,
  setForm,
  teamOn,
  prefillBooking,
  createLoading,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white p-6 border-b border-gray-100 flex justify-between items-center z-10">
          <div>
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Buat Jadwal</div>
            <div className="font-black text-xl">{editId ? 'Edit Jadwal' : title}</div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500" type="button">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleCreate} className="p-6 space-y-5">
          <div className="bg-brand-dark rounded-2xl p-4 text-white text-sm font-semibold">
            Tips: Isi <span className="font-black">Order ID</span> untuk auto-isi (jika data booking ada). Kalau manual,
            isi field lainnya.
          </div>

          {prefillBooking?.order_id && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-emerald-800/70">Dari Booking</div>
              <div className="mt-1 font-black text-emerald-900">
                {prefillBooking.order_id} • {prefillBooking.item_name || 'Motor'}
              </div>
              <div className="mt-1 text-xs text-emerald-900/80 font-bold">
                {prefillBooking.user_name || 'Pelanggan'}
                {prefillBooking.user_phone ? ` • ${prefillBooking.user_phone}` : ''}
              </div>
              <div className="mt-2 text-xs text-emerald-900/80 font-bold">
                Lokasi: {prefillBooking.delivery_address || prefillBooking.location || '—'}
              </div>
              <div className="mt-2 text-xs text-emerald-900/80 font-bold">
                Kamu cukup pilih <span className="font-black">PIC</span> dan atur jam, lalu simpan.
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Order ID (opsional)</label>
              <input
                value={form.order_id}
                onChange={(e) => setForm((p) => ({ ...p, order_id: e.target.value }))}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-brand-primary"
                placeholder="Cth: ORD-2026-0001"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Tanggal & Jam</label>
              <input
                type="datetime-local"
                required
                value={form.scheduled_at}
                onChange={(e) => setForm((p) => ({ ...p, scheduled_at: e.target.value }))}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-brand-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Jenis Motor</label>
              <input
                value={form.motor_type}
                onChange={(e) => setForm((p) => ({ ...p, motor_type: e.target.value }))}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-brand-primary"
                placeholder="Cth: Scoopy / Vario 160"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Nama Pelanggan</label>
              <input
                value={form.customer_name}
                onChange={(e) => setForm((p) => ({ ...p, customer_name: e.target.value }))}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-brand-primary"
                placeholder="Nama pelanggan"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">No. HP Pelanggan</label>
              <input
                value={form.customer_phone}
                onChange={(e) => setForm((p) => ({ ...p, customer_phone: e.target.value }))}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-brand-primary"
                placeholder="08xxxxxxxxxx"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">PIC Pengantar</label>
              <input
                list="team_on_suggest"
                value={form.assigned_to_name}
                onChange={(e) => setForm((p) => ({ ...p, assigned_to_name: e.target.value }))}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-brand-primary"
                placeholder="Nama tim/driver"
              />
              <datalist id="team_on_suggest">
                {(teamOn || []).map((m) => (
                  <option key={m.id} value={m.name}>
                    {m.base_location || ''} {m.role_tag ? `• ${m.role_tag}` : ''}
                  </option>
                ))}
              </datalist>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Lokasi Antar / Ambil</label>
            <input
              value={form.location_text}
              onChange={(e) => setForm((p) => ({ ...p, location_text: e.target.value }))}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-brand-primary"
              placeholder="Alamat lengkap / patokan"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Catatan (opsional)</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-brand-primary min-h-[96px]"
              placeholder="Catatan tambahan untuk tim pengantar"
            />
          </div>

          <button
            type="submit"
            disabled={createLoading}
            className="w-full bg-brand-primary text-white py-4 rounded-2xl font-black text-lg hover:bg-rose-700 transition flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {createLoading ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
            {editId ? 'Simpan Perubahan' : 'Simpan Jadwal'}
          </button>
        </form>
      </div>
    </div>
  );
}

