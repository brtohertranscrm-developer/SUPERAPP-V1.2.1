import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../../utils/api';
import { resolveMediaUrl } from '../../../utils/media';

const ArmadaModal = ({ onClose, onSubmit, initialData }) => {
  const normalizeCategory = (value) => {
    if (!value) return 'Matic';
    if (value === 'EV') return 'EV';
    return value;
  };

  const normalizeCc = (value, categoryValue) => {
    if (categoryValue === 'EV') return 'Listrik';
    if (value === 'Listrik') return 'Listrik';
    return String(value || '125');
  };

  const [formData, setFormData] = useState({
    name:                  '',
    display_name:          '',
    cc:                    '125',
    category:              'Matic',
    location:              'Yogyakarta',
    price_12h:             0,
    base_price:            0,
    stock:                 1,
    image_url:             '',
    allow_dynamic_pricing: 1,
  });

  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (initialData) {
      const normalizedCategory = normalizeCategory(initialData.category);
      setFormData({
        ...initialData,
        display_name: initialData.display_name || initialData.name || '',
        cc: normalizeCc(initialData.cc, normalizedCategory),
        category: normalizedCategory,
        allow_dynamic_pricing:
          initialData.allow_dynamic_pricing !== undefined
            ? initialData.allow_dynamic_pricing
            : 1,
      });
    }
  }, [initialData]);

  const handleThumbUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const uploadData = new FormData();
    uploadData.append('image', file);

    try {
      let token = localStorage.getItem('admin_token') || localStorage.getItem('token');
      if (token === 'undefined' || token === 'null') token = null;

      const response = await fetch(`${API_BASE_URL}/api/admin/upload/motors`, {
        method: 'POST',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: uploadData,
      });

      const result = await response.json();
      if (result.success && result.url) {
        setFormData((prev) => ({ ...prev, image_url: result.url }));
      } else {
        alert('Gagal mengunggah gambar: ' + (result.error || result.message || 'Error server'));
      }
    } catch (error) {
      console.error('Upload motor thumbnail error:', error);
      alert('Terjadi kesalahan jaringan saat mengunggah gambar');
    } finally {
      setIsUploading(false);
      // allow re-uploading same file if needed
      e.target.value = '';
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'category') {
      const nextCategory = normalizeCategory(value);
      setFormData(prev => ({
        ...prev,
        category: nextCategory,
        cc: nextCategory === 'EV'
          ? 'Listrik'
          : (prev.cc === 'Listrik' ? '125' : prev.cc),
      }));
      return;
    }

    if (name === 'cc') {
      setFormData(prev => ({
        ...prev,
        cc: value,
        category: value === 'Listrik' ? 'EV' : (prev.category === 'EV' ? 'Matic' : prev.category),
      }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (checked ? 1 : 0) : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      cc: formData.category === 'EV' ? 'Listrik' : formData.cc,
      category: normalizeCategory(formData.category),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">

        <div className="p-6 border-b border-slate-100">
          <h2 className="text-xl font-black text-slate-800">
            {initialData ? 'Edit Katalog Armada' : 'Tambah Katalog Baru'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 bg-slate-50">

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Nama Motor</label>
            <input type="text" name="name" value={formData.name} onChange={handleChange} required
              className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Contoh: Honda Vario 160 - Yogyakarta" />
            <p className="mt-1.5 text-[11px] text-slate-400 font-bold">
              Pakai nama internal yang jelas per kota untuk memudahkan operasional.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Nama Tampil ke User</label>
            <input type="text" name="display_name" value={formData.display_name} onChange={handleChange} required
              className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Contoh: Honda Vario 160" />
            <p className="mt-1.5 text-[11px] text-slate-400 font-bold">
              Nama ini yang muncul di katalog, search, checkout, dan detail booking user.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Kota</label>
              <select name="location" value={formData.location} onChange={handleChange}
                className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none">
                <option value="Yogyakarta">Yogyakarta</option>
                <option value="Solo">Solo</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Jenis Kendaraan</label>
              <select name="category" value={formData.category} onChange={handleChange}
                className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none">
                <option value="Matic">Matic</option>
                <option value="Manual">Manual</option>
                <option value="Sport">Sport/Premium</option>
                <option value="EV">Listrik</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="col-span-2 md:col-span-1">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Kapasitas (CC)</label>
              <select name="cc" value={formData.cc} onChange={handleChange}
                className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none">
                <option value="110">110 cc</option>
                <option value="125">125 cc</option>
                <option value="150">150 cc</option>
                <option value="155">155 cc</option>
                <option value="250">250 cc</option>
                <option value="Listrik">Listrik</option>
              </select>
              <p className="mt-1.5 text-[11px] text-slate-400 font-bold">
                Pilih `Listrik` untuk motor EV. Kategori akan menyesuaikan otomatis.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Harga 12 Jam</label>
              <input type="number" name="price_12h" value={formData.price_12h} onChange={handleChange} required
                className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Harga 24 Jam</label>
              <input type="number" name="base_price" value={formData.base_price} onChange={handleChange} required
                className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Gambar Thumbnail</label>

            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleThumbUpload}
                  disabled={isUploading}
                  className="block w-full text-sm file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-black file:bg-slate-900 file:text-white hover:file:bg-rose-600 disabled:opacity-60"
                />
              </div>

              {formData.image_url ? (
                <div className="w-full h-40 rounded-2xl overflow-hidden border border-slate-200 bg-white">
                  <img
                    src={resolveMediaUrl(formData.image_url)}
                    alt="Preview Thumbnail"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-full h-24 rounded-2xl border border-dashed border-slate-300 bg-white flex items-center justify-center text-xs font-bold text-slate-400">
                  Belum ada gambar (opsional)
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Atau isi URL manual (opsional)</label>
                <input
                  type="text"
                  name="image_url"
                  value={formData.image_url}
                  onChange={handleChange}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://..."
                />
                {isUploading && (
                  <p className="mt-1.5 text-[11px] text-slate-500 font-bold">Sedang upload ke ImageKit...</p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-2 p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-between shadow-sm">
            <div className="pr-4">
              <p className="text-sm font-black text-indigo-900 leading-tight mb-1">Izinkan Harga Dinamis</p>
              <p className="text-[10px] text-indigo-600 font-bold leading-tight">
                Matikan untuk armada VIP / Limited agar kebal dari lonjakan harga.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input type="checkbox" name="allow_dynamic_pricing"
                checked={formData.allow_dynamic_pricing === 1}
                onChange={handleChange} className="sr-only peer" />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-200">
            <button type="button" onClick={onClose}
              className="px-5 py-2.5 text-sm font-bold text-slate-500 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
              Batal
            </button>
            <button type="submit"
              className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-md transition-colors">
              Simpan Data
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default ArmadaModal;
