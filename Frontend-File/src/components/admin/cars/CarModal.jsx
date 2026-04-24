import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../../../utils/api';
import { resolveMediaUrl } from '../../../utils/media';

const CATEGORIES = ['City Car', 'MPV', 'SUV', 'Luxury', 'Other'];

export default function CarModal({ onClose, onSubmit, initialData }) {
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    category: 'City Car',
    seats: 5,
    transmission: 'AT',
    base_price: 0,
    image_url: '',
    description: '',
  });

  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        display_name: initialData.display_name || initialData.name || '',
        category: initialData.category || 'City Car',
        seats: Number(initialData.seats) || 5,
        transmission: (initialData.transmission || 'AT').toUpperCase(),
        base_price: Number(initialData.base_price) || 0,
        image_url: initialData.image_url || '',
        description: initialData.description || '',
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const body = new FormData();
    body.append('image', file);

    try {
      let token = localStorage.getItem('admin_token') || localStorage.getItem('token');
      if (token === 'undefined' || token === 'null') token = null;

      const res = await fetch(`${API_BASE_URL}/api/admin/upload/cars`, {
        method: 'POST',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body,
      });
      const data = await res.json();
      if (data?.success && data?.url) {
        setFormData((p) => ({ ...p, image_url: data.url }));
      } else {
        alert(data?.error || 'Gagal upload gambar mobil.');
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      alert('Gagal upload gambar mobil (jaringan).');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      seats: parseInt(formData.seats, 10) || 5,
      base_price: parseInt(formData.base_price, 10) || 0,
      transmission: String(formData.transmission || 'AT').toUpperCase(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-xl font-black text-slate-800">
            {initialData ? 'Edit Katalog Mobil' : 'Tambah Katalog Mobil'}
          </h2>
          <p className="text-[11px] text-slate-500 font-bold mt-1">
            Katalog = model mobil. Unit fisik (plat) dikelola terpisah.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 bg-slate-50">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Nama Internal</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm"
              placeholder="Contoh: brio_at"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Nama Tampil ke User</label>
            <input
              type="text"
              name="display_name"
              value={formData.display_name}
              onChange={handleChange}
              required
              className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm"
              placeholder="Contoh: Honda Brio"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Kategori</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm appearance-none"
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Transmisi</label>
              <select
                name="transmission"
                value={formData.transmission}
                onChange={handleChange}
                className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm appearance-none"
              >
                <option value="AT">AT</option>
                <option value="MT">MT</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Kursi</label>
              <input
                type="number"
                min={2}
                max={12}
                name="seats"
                value={formData.seats}
                onChange={handleChange}
                className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Harga / Hari</label>
              <input
                type="number"
                min={0}
                name="base_price"
                value={formData.base_price}
                onChange={handleChange}
                className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Gambar</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleUpload}
              disabled={isUploading}
              className="block w-full text-sm file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-black file:bg-slate-900 file:text-white hover:file:bg-rose-600 disabled:opacity-60"
            />

            {formData.image_url ? (
              <div className="mt-3 w-full h-40 rounded-2xl overflow-hidden border border-slate-200 bg-white">
                <img
                  src={resolveMediaUrl(formData.image_url)}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="mt-3 w-full h-24 rounded-2xl border border-dashed border-slate-300 bg-white flex items-center justify-center text-xs font-bold text-slate-400">
                Belum ada gambar (opsional)
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Deskripsi (opsional)</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm min-h-[96px]"
              placeholder="Contoh: Irit, nyaman untuk dalam kota, bagasi cukup besar."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-5 py-3 rounded-xl bg-white border border-slate-200 font-black text-slate-700"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-1 px-5 py-3 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-black"
            >
              Simpan
            </button>
          </div>
          {isUploading ? (
            <div className="text-[11px] font-bold text-slate-500">Sedang upload ke ImageKit...</div>
          ) : null}
        </form>
      </div>
    </div>
  );
}

