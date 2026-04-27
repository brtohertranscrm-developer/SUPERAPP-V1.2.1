import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCcw, Pencil, Trash2, XCircle, MapPin, Save } from 'lucide-react';
import { apiFetch } from '../../utils/api';

const TYPE_OPTIONS = [
  { value: 'attraction', label: 'Objek Wisata' },
  { value: 'charging', label: 'Charging Station' },
];

const CITY_OPTIONS = [
  { value: 'jogja', label: 'Jogja' },
  { value: 'solo', label: 'Solo' },
];

const emptyForm = {
  id: null,
  place_type: 'attraction',
  city: 'jogja',
  name: '',
  address: '',
  maps_url: '',
  description: '',
  is_active: 1,
  sort_order: 0,
};

export default function AdminPlaces() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [places, setPlaces] = useState([]);

  const [filterType, setFilterType] = useState('all');
  const [filterCity, setFilterCity] = useState('all');
  const [filterActive, setFilterActive] = useState('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const title = useMemo(() => (form.id ? 'Edit Place' : 'Tambah Place'), [form.id]);

  const loadPlaces = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams();
      if (filterType !== 'all') qs.set('type', filterType);
      if (filterCity !== 'all') qs.set('city', filterCity);
      if (filterActive === '1' || filterActive === '0') qs.set('active', filterActive);
      const suffix = qs.toString() ? `?${qs.toString()}` : '';
      const res = await apiFetch(`/api/admin/places${suffix}`);
      setPlaces(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      setError(e?.message || 'Gagal memuat data.');
    } finally {
      setLoading(false);
    }
  }, [filterActive, filterCity, filterType]);

  useEffect(() => {
    // eslint-disable-next-line no-void
    void loadPlaces();
  }, [loadPlaces]);

  const openNew = () => {
    setError('');
    setForm(emptyForm);
    setIsModalOpen(true);
  };

  const openEdit = (row) => {
    setError('');
    setForm({
      id: row.id,
      place_type: row.place_type || 'attraction',
      city: row.city || 'jogja',
      name: row.name || '',
      address: row.address || '',
      maps_url: row.maps_url || '',
      description: row.description || '',
      is_active: Number(row.is_active) === 0 ? 0 : 1,
      sort_order: Number.isFinite(Number(row.sort_order)) ? Number(row.sort_order) : 0,
    });
    setIsModalOpen(true);
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const body = {
        ...form,
        sort_order: Number(form.sort_order) || 0,
        is_active: form.is_active ? 1 : 0,
      };
      if (!body.name?.trim()) throw new Error('Nama wajib diisi.');

      if (form.id) {
        await apiFetch(`/api/admin/places/${form.id}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        });
      } else {
        await apiFetch('/api/admin/places', {
          method: 'POST',
          body: JSON.stringify(body),
        });
      }
      setIsModalOpen(false);
      setForm(emptyForm);
      await loadPlaces();
    } catch (e) {
      setError(e?.message || 'Gagal menyimpan.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row) => {
    const ok = window.confirm(`Hapus "${row?.name || 'place'}"?`);
    if (!ok) return;
    setLoading(true);
    setError('');
    try {
      await apiFetch(`/api/admin/places/${row.id}`, { method: 'DELETE' });
      await loadPlaces();
    } catch (e) {
      setError(e?.message || 'Gagal menghapus.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <MapPin className="text-rose-500" />
            <h1 className="text-2xl font-black text-slate-900">Peta & Lokasi</h1>
          </div>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Kelola daftar rekomendasi <span className="font-black">Objek Wisata</span> &amp;{' '}
            <span className="font-black">Charging Station</span> untuk tampil di Dashboard User.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadPlaces}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-slate-200 shadow-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCcw size={16} /> Refresh
          </button>
          <button
            type="button"
            onClick={openNew}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-rose-500 text-white shadow-sm font-black hover:bg-rose-600"
          >
            <Plus size={16} /> Tambah
          </button>
        </div>
      </div>

      <div className="mt-6 bg-white border border-slate-100 rounded-[2rem] p-5 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="block">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Tipe</div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 outline-none font-black text-slate-800"
            >
              <option value="all">Semua</option>
              {TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Kota</div>
            <select
              value={filterCity}
              onChange={(e) => setFilterCity(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 outline-none font-black text-slate-800"
            >
              <option value="all">Semua</option>
              {CITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Status</div>
            <select
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 outline-none font-black text-slate-800"
            >
              <option value="all">Semua</option>
              <option value="1">Aktif</option>
              <option value="0">Nonaktif</option>
            </select>
          </label>
        </div>

        {error ? (
          <div className="mt-4 bg-red-50 text-red-600 p-4 rounded-2xl border border-red-100 font-bold flex items-center gap-2">
            <XCircle size={18} /> {error}
          </div>
        ) : null}

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-3 px-3 font-black">Nama</th>
                <th className="py-3 px-3 font-black">Tipe</th>
                <th className="py-3 px-3 font-black">Kota</th>
                <th className="py-3 px-3 font-black">Urutan</th>
                <th className="py-3 px-3 font-black">Status</th>
                <th className="py-3 px-3 font-black text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {places.length === 0 && !loading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400 font-bold">
                    Belum ada data. Klik <span className="text-slate-900">Tambah</span> untuk mulai.
                  </td>
                </tr>
              ) : null}

              {places.map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="py-4 px-3">
                    <div className="font-black text-slate-900">{p.name}</div>
                    <div className="text-xs text-slate-500 font-medium line-clamp-1">{p.address || p.maps_url || '-'}</div>
                  </td>
                  <td className="py-4 px-3 font-bold text-slate-700">{p.place_type}</td>
                  <td className="py-4 px-3 font-bold text-slate-700">{p.city}</td>
                  <td className="py-4 px-3 font-bold text-slate-700">{p.sort_order ?? 0}</td>
                  <td className="py-4 px-3">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      Number(p.is_active) === 0 ? 'bg-slate-100 text-slate-500' : 'bg-emerald-500/10 text-emerald-700'
                    }`}>
                      {Number(p.is_active) === 0 ? 'Nonaktif' : 'Aktif'}
                    </span>
                  </td>
                  <td className="py-4 px-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(p)}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl bg-white border border-slate-200 font-black text-slate-700 hover:bg-slate-50"
                      >
                        <Pencil size={14} /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(p)}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl bg-rose-50 border border-rose-100 font-black text-rose-600 hover:bg-rose-100"
                      >
                        <Trash2 size={14} /> Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50">
          <div className="w-full max-w-2xl bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl p-6 relative">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50"
            >
              <XCircle className="text-slate-500" size={20} />
            </button>

            <div className="text-xl font-black text-slate-900">{title}</div>
            <div className="text-sm text-slate-500 font-medium mt-1">
              Isi informasi singkat, lalu tambahkan link <span className="font-black">Google Maps</span> agar user bisa buka peta.
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Tipe</div>
                <select
                  value={form.place_type}
                  onChange={(e) => setForm((p) => ({ ...p, place_type: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 outline-none font-black text-slate-800"
                >
                  {TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Kota</div>
                <select
                  value={form.city}
                  onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 outline-none font-black text-slate-800"
                >
                  {CITY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </label>

              <label className="block sm:col-span-2">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Nama</div>
                <input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 outline-none font-black text-slate-800"
                  placeholder="Contoh: Taman Sari"
                />
              </label>

              <label className="block sm:col-span-2">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Alamat (opsional)</div>
                <input
                  value={form.address}
                  onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 outline-none font-bold text-slate-800"
                  placeholder="Alamat singkat"
                />
              </label>

              <label className="block sm:col-span-2">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Link Google Maps (opsional)</div>
                <input
                  value={form.maps_url}
                  onChange={(e) => setForm((p) => ({ ...p, maps_url: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 outline-none font-bold text-slate-800"
                  placeholder="https://maps.app.goo.gl/..."
                />
              </label>

              <label className="block sm:col-span-2">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Deskripsi (opsional)</div>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 outline-none font-medium text-slate-800 min-h-[90px]"
                  placeholder="Catatan singkat untuk user"
                />
              </label>

              <label className="block">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Urutan</div>
                <input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm((p) => ({ ...p, sort_order: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 outline-none font-black text-slate-800"
                />
              </label>

              <label className="block">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Status</div>
                <select
                  value={form.is_active ? '1' : '0'}
                  onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.value === '1' ? 1 : 0 }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 outline-none font-black text-slate-800"
                >
                  <option value="1">Aktif</option>
                  <option value="0">Nonaktif</option>
                </select>
              </label>
            </div>

            {error ? (
              <div className="mt-4 bg-red-50 text-red-600 p-4 rounded-2xl border border-red-100 font-bold flex items-center gap-2">
                <XCircle size={18} /> {error}
              </div>
            ) : null}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-3 rounded-2xl bg-white border border-slate-200 font-black text-slate-700 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-rose-500 text-white font-black hover:bg-rose-600 disabled:opacity-60"
              >
                <Save size={16} /> {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

