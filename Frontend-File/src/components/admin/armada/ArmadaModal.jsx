import React, { useState, useEffect } from 'react';

const ArmadaModal = ({ onClose, onSubmit, initialData }) => {
  const [formData, setFormData] = useState({
    name:                  '',
    category:              'Matic',
    location:              'Yogyakarta',
    price_12h:             0,
    base_price:            0,
    stock:                 1,
    image_url:             '',
    allow_dynamic_pricing: 1,
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        allow_dynamic_pricing:
          initialData.allow_dynamic_pricing !== undefined
            ? initialData.allow_dynamic_pricing
            : 1,
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (checked ? 1 : 0) : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
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
              placeholder="Contoh: Honda Vario 160" />
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
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Kategori</label>
              <select name="category" value={formData.category} onChange={handleChange}
                className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none">
                <option value="Matic">Matic</option>
                <option value="Manual">Manual</option>
                <option value="Sport">Sport/Premium</option>
              </select>
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
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">URL Gambar Thumbnail</label>
            <input type="text" name="image_url" value={formData.image_url} onChange={handleChange}
              className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://..." />
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
