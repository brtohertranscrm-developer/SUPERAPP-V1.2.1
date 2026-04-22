import React, { useEffect, useState } from 'react';
import { PackagePlus, X, Loader2 } from 'lucide-react';

export default function AddonModal({ onClose, onSubmit, initialData }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    addon_type: 'addon',
    is_active: 1,
    allow_quantity: 0,
    max_qty: 1,
    sort_order: 0,
  });

  useEffect(() => {
    if (!initialData) return;
    setForm({
      name: initialData.name || '',
      description: initialData.description || '',
      price: initialData.price === 0 || initialData.price ? String(initialData.price) : '',
      addon_type: initialData.addon_type || 'addon',
      is_active: Number(initialData.is_active) === 0 ? 0 : 1,
      allow_quantity: Number(initialData.allow_quantity) === 1 ? 1 : 0,
      max_qty: initialData.max_qty ? Number(initialData.max_qty) : 1,
      sort_order: initialData.sort_order ? Number(initialData.sort_order) : 0,
    });
  }, [initialData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const ok = await onSubmit(
      {
        ...form,
        price: form.price === '' ? 0 : Number(form.price),
        max_qty: form.allow_quantity ? Number(form.max_qty) : 1,
        sort_order: Number(form.sort_order) || 0,
      },
      initialData?.id
    );
    if (ok) onClose();
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full max-w-md max-h-[90vh] flex flex-col bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-fade-in-up">

        <div className="shrink-0 bg-slate-900 p-6 flex justify-between items-center text-white z-10">
          <h3 className="font-black text-xl flex items-center gap-2">
            <PackagePlus size={20} /> {initialData?.id ? 'Edit Add-on/Paket' : 'Add-on/Paket Baru'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Nama</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="Cth: Holder HP"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Deskripsi (opsional)</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none h-20 resize-none"
                placeholder="Jelaskan singkat manfaatnya..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Tipe</label>
                <select
                  value={form.addon_type}
                  onChange={(e) => setForm({ ...form, addon_type: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500 outline-none appearance-none"
                >
                  <option value="addon">Add-on</option>
                  <option value="package">Paket</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Harga (Rp)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="10000"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <label className="flex items-center gap-2 text-sm font-black text-slate-800">
                  <input
                    type="checkbox"
                    checked={form.allow_quantity === 1}
                    onChange={(e) => setForm({ ...form, allow_quantity: e.target.checked ? 1 : 0 })}
                  />
                  Bisa Qty
                </label>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Aktifkan jika item bisa lebih dari 1.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Max Qty</label>
                <input
                  type="number"
                  min="1"
                  disabled={form.allow_quantity !== 1}
                  value={form.max_qty}
                  onChange={(e) => setForm({ ...form, max_qty: e.target.value === '' ? 1 : Number(e.target.value) })}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500 outline-none disabled:opacity-50"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Urutan (sort)</label>
                <input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: e.target.value === '' ? 0 : Number(e.target.value) })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Status</label>
                <select
                  value={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: Number(e.target.value) })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500 outline-none appearance-none"
                >
                  <option value={1}>Aktif</option>
                  <option value={0}>Nonaktif</option>
                </select>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-emerald-500 text-white font-black py-4 rounded-xl hover:bg-slate-900 transition-all flex justify-center items-center gap-2 active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="animate-spin" /> : (initialData?.id ? 'Simpan Perubahan' : 'Tambah Item')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

