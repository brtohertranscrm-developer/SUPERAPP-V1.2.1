import React, { useState, useEffect } from 'react';
import { X, Loader2, Package, Lock } from 'lucide-react';

const DEFAULT_PRICES = {
  terbuka:  { price_1h: 5000, price_12h: 35000, price_24h: 50000, dimensions: '50x100x40' },
  tertutup: { price_1h: 7000, price_12h: 45000, price_24h: 65000, dimensions: '90x60x50' }
};

const fmtRp = (n) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;

const LokerModal = ({ onClose, onSubmit, initialData }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    location: '',
    stock: '',
    type: 'terbuka',
    price_1h: DEFAULT_PRICES.terbuka.price_1h,
    price_12h: DEFAULT_PRICES.terbuka.price_12h,
    price_24h: DEFAULT_PRICES.terbuka.price_24h,
    dimensions: DEFAULT_PRICES.terbuka.dimensions
  });

  useEffect(() => {
    if (initialData) {
      setForm({
        location:   initialData.location   || '',
        stock:      initialData.stock      || '',
        type:       initialData.type       || 'terbuka',
        price_1h:   initialData.price_1h   || DEFAULT_PRICES[initialData.type || 'terbuka'].price_1h,
        price_12h:  initialData.price_12h  || DEFAULT_PRICES[initialData.type || 'terbuka'].price_12h,
        price_24h:  initialData.price_24h  || DEFAULT_PRICES[initialData.type || 'terbuka'].price_24h,
        dimensions: initialData.dimensions || DEFAULT_PRICES[initialData.type || 'terbuka'].dimensions
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Auto-isi harga default saat ganti type
  const handleTypeChange = (type) => {
    setForm((prev) => ({
      ...prev,
      type,
      price_1h:   DEFAULT_PRICES[type].price_1h,
      price_12h:  DEFAULT_PRICES[type].price_12h,
      price_24h:  DEFAULT_PRICES[type].price_24h,
      dimensions: DEFAULT_PRICES[type].dimensions
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const payload = {
      ...form,
      stock:     parseInt(form.stock),
      price_1h:  parseInt(form.price_1h),
      price_12h: parseInt(form.price_12h),
      price_24h: parseInt(form.price_24h)
    };
    const ok = initialData
      ? await onSubmit(initialData.id, payload)
      : await onSubmit(payload);
    if (ok) onClose();
    setIsSubmitting(false);
  };

  const isEdit = !!initialData;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[92vh] overflow-y-auto">

        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-xl font-black text-slate-800">
            {isEdit ? 'Edit Loker' : 'Tambah Loker Baru'}
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-rose-500 rounded-xl hover:bg-rose-50 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5 bg-slate-50">

          {/* Pilih Tipe */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Tipe Loker</label>
            <div className="grid grid-cols-2 gap-3">
              {['terbuka', 'tertutup'].map((t) => {
                const isActive = form.type === t;
                const Icon = t === 'terbuka' ? Package : Lock;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleTypeChange(t)}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                      isActive
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isActive ? 'bg-blue-100' : 'bg-slate-100'
                    }`}>
                      <Icon size={20} className={isActive ? 'text-blue-600' : 'text-slate-400'} />
                    </div>
                    <div>
                      <p className={`text-sm font-black capitalize ${isActive ? 'text-blue-700' : 'text-slate-700'}`}>{t}</p>
                      <p className="text-[11px] text-slate-400">{DEFAULT_PRICES[t].dimensions} cm</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lokasi & Stok */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Lokasi</label>
              <input
                type="text"
                name="location"
                value={form.location}
                onChange={handleChange}
                required
                placeholder="Contoh: Malioboro"
                className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Stok Unit</label>
              <input
                type="number"
                name="stock"
                value={form.stock}
                onChange={handleChange}
                required min="0"
                placeholder="10"
                className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Pricing Tier */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Harga Sewa</label>
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              {[
                { label: 'Per Jam (1h)', name: 'price_1h' },
                { label: 'Paket 12 Jam', name: 'price_12h' },
                { label: 'Paket 24 Jam', name: 'price_24h' }
              ].map((tier, i) => (
                <div key={tier.name} className={`flex items-center gap-3 p-3 ${i < 2 ? 'border-b border-slate-100' : ''}`}>
                  <span className="text-sm text-slate-600 w-28 shrink-0">{tier.label}</span>
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">Rp</span>
                    <input
                      type="number"
                      name={tier.name}
                      value={form[tier.name]}
                      onChange={handleChange}
                      required min="0"
                      className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              Hemat otomatis: sistem akan pilih kombinasi paket termurah untuk pelanggan.
            </p>
          </div>

          {/* Dimensi */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
              Dimensi <span className="text-slate-400 font-normal normal-case">(P×L×T dalam cm)</span>
            </label>
            <input
              type="text"
              name="dimensions"
              value={form.dimensions}
              onChange={handleChange}
              placeholder="90x60x50"
              className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Preview harga */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <p className="text-xs font-bold text-blue-700 uppercase tracking-widest mb-2">Preview Harga</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { l: '1 jam', v: form.price_1h },
                { l: '12 jam', v: form.price_12h },
                { l: '24 jam', v: form.price_24h }
              ].map((p) => (
                <div key={p.l} className="bg-white rounded-lg p-2 border border-blue-100">
                  <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">{p.l}</p>
                  <p className="text-sm font-black text-blue-700 mt-0.5">{fmtRp(p.v)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-500 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
              Batal
            </button>
            <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-md transition-colors disabled:opacity-50 flex items-center gap-2">
              {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Menyimpan...</> : 'Simpan Loker'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default LokerModal;
