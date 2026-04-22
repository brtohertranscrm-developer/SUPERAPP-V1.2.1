import React, { useEffect, useState } from 'react';
import { Handshake, X, Loader2 } from 'lucide-react';

const PartnerModal = ({ onClose, onSubmit, initialData }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: 'Partner',
    city: 'Yogyakarta',
    address: '',
    headline: '',
    promo_text: '',
    terms: '',
    image_url: '',
    cta_label: 'Lihat Promo',
    cta_url: '',
    maps_url: '',
    phone_wa: '',
    sort_order: 0,
    valid_until: '',
    is_active: 1,
  });

  useEffect(() => {
    if (!initialData) return;
    setFormData({
      name: initialData.name || '',
      category: initialData.category || 'Partner',
      city: initialData.city || 'Yogyakarta',
      address: initialData.address || '',
      headline: initialData.headline || '',
      promo_text: initialData.promo_text || '',
      terms: initialData.terms || '',
      image_url: initialData.image_url || '',
      cta_label: initialData.cta_label || 'Lihat Promo',
      cta_url: initialData.cta_url || '',
      maps_url: initialData.maps_url || '',
      phone_wa: initialData.phone_wa || '',
      sort_order: Number.isFinite(Number(initialData.sort_order)) ? Number(initialData.sort_order) : 0,
      valid_until: initialData.valid_until || '',
      is_active: Number(initialData.is_active) === 1 ? 1 : 0,
    });
  }, [initialData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const success = await onSubmit(formData, initialData?.id);
    if (success) onClose();
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-fade-in-up">

        <div className="shrink-0 bg-slate-900 p-6 flex justify-between items-center text-white z-10">
          <h3 className="font-black text-xl flex items-center gap-2">
            <Handshake size={20} /> {initialData?.id ? 'Edit Partner' : 'Partner Baru'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Nama Partner</label>
                <input
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Cth: Bengkel Mas Joko"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Kategori</label>
                <input
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Bengkel / Toko / Wisata"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Kota</label>
                <select
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
                >
                  <option value="Yogyakarta">Yogyakarta</option>
                  <option value="Solo">Solo</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Urutan Tampil (sort_order)</label>
                <input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: e.target.value === '' ? 0 : Number(e.target.value) })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Alamat (opsional)</label>
              <input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Alamat singkat"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Headline (tampil ringkas)</label>
              <input
                value={formData.headline}
                onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Cth: Diskon 10% untuk penyewa Brother Trans"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Promo Text (detail)</label>
              <textarea
                value={formData.promo_text}
                onChange={(e) => setFormData({ ...formData, promo_text: e.target.value })}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none"
                placeholder="Detail promo, syarat singkat, dll."
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">S&K (opsional)</label>
              <textarea
                value={formData.terms}
                onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none h-20 resize-none"
                placeholder="Cth: Berlaku sampai 30 April, tunjukkan e-ticket."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">URL Gambar/Logo</label>
                <input
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Maps URL (opsional)</label>
                <input
                  value={formData.maps_url}
                  onChange={(e) => setFormData({ ...formData, maps_url: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="https://maps.google.com/..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">CTA URL (IG/Website/Promo)</label>
                <input
                  value={formData.cta_url}
                  onChange={(e) => setFormData({ ...formData, cta_url: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">CTA Label</label>
                <input
                  value={formData.cta_label}
                  onChange={(e) => setFormData({ ...formData, cta_label: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Lihat Promo"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">No WA (opsional)</label>
                <input
                  value={formData.phone_wa}
                  onChange={(e) => setFormData({ ...formData, phone_wa: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="62812xxxxxxx"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Valid Until (opsional)</label>
                <input
                  value={formData.valid_until}
                  onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="2026-04-30 atau 2026-04-30 23:59:59"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
              <input
                type="checkbox"
                checked={Number(formData.is_active) === 1}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked ? 1 : 0 })}
              />
              Aktifkan tampil di homepage
            </label>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-indigo-600 text-white font-black py-4 rounded-xl hover:bg-slate-900 transition-all flex justify-center items-center gap-2 active:scale-95"
              >
                {isSubmitting ? <Loader2 className="animate-spin" /> : (initialData?.id ? 'Simpan Perubahan' : 'Simpan Partner')}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
};

export default PartnerModal;

