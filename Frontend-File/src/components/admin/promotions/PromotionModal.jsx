import React, { useState, useEffect } from 'react';
import { Ticket, X, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '../../../utils/api';
import { resolveMediaUrl } from '../../../utils/media';

const PromotionModal = ({ onClose, onSubmit, initialData }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    code: '',
    image: '',
    desc: '',
    tag: 'Diskon',
    discount_percent: '',
    max_discount: '',
    usage_limit: 0,
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        code: initialData.code || '',
        image: initialData.image || '',
        desc: initialData.desc || '',
        tag: initialData.tag || 'Diskon',
        discount_percent:
          initialData.discount_percent === 0 || initialData.discount_percent
            ? String(initialData.discount_percent)
            : '',
        max_discount:
          initialData.max_discount === 0 || initialData.max_discount
            ? String(initialData.max_discount)
            : '',
        usage_limit:
          initialData.usage_limit === 0 || initialData.usage_limit
            ? Number(initialData.usage_limit)
            : 0,
      });
    }
  }, [initialData]);

  const handleBannerUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const uploadData = new FormData();
    uploadData.append('image', file);

    try {
      let token = localStorage.getItem('admin_token') || localStorage.getItem('token');
      if (token === 'undefined' || token === 'null') token = null;

      const response = await fetch(`${API_BASE_URL}/api/admin/upload/banner`, {
        method: 'POST',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: uploadData,
      });

      const result = await response.json();
      if (result.success && result.url) {
        setFormData((prev) => ({ ...prev, image: result.url }));
      } else {
        alert('Gagal mengunggah banner: ' + (result.error || result.message || 'Error server'));
      }
    } catch (error) {
      console.error('Upload banner promo error:', error);
      alert('Terjadi kesalahan jaringan saat mengunggah banner');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const success = await onSubmit(formData, initialData?.id);
    if (success) {
      onClose();
    }
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full max-w-md max-h-[90vh] flex flex-col bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-fade-in-up">
        
        <div className="shrink-0 bg-slate-900 p-6 flex justify-between items-center text-white z-10">
          <h3 className="font-black text-xl flex items-center gap-2">
            <Ticket size={20}/> {initialData?.id ? 'Edit Promo' : 'Promo Baru'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Judul Promo</label>
              <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Cth: Promo Liburan Sekolah" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Kode Voucher</label>
                <input required value={formData.code} onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-black focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="BROTHER20" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Tag Kategori</label>
                <select value={formData.tag} onChange={e => setFormData({...formData, tag: e.target.value})}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500 outline-none appearance-none">
                  <option value="Diskon">Diskon</option>
                  <option value="Cashback">Cashback</option>
                  <option value="Miles">Bonus Miles</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Diskon (%)</label>
                <input
                  type="number"
                  required
                  min="1"
                  max="100"
                  value={formData.discount_percent}
                  onChange={e => setFormData({...formData, discount_percent: e.target.value})}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="20"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Kuota (0 = unlimited)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.usage_limit}
                  onChange={e => setFormData({...formData, usage_limit: e.target.value === '' ? 0 : Number(e.target.value)})}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="0"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Maks Potongan (Rp, 0 = tanpa batas)</label>
              <input
                type="number"
                min="0"
                value={formData.max_discount}
                onChange={e => setFormData({...formData, max_discount: e.target.value})}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="0"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Gambar Banner Promo</label>

              <div className="flex flex-col gap-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleBannerUpload}
                  disabled={isUploading}
                  className="block w-full text-sm file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-black file:bg-slate-900 file:text-white hover:file:bg-emerald-500 disabled:opacity-60"
                />

                {formData.image ? (
                  <div className="w-full h-40 rounded-2xl overflow-hidden border border-slate-200 bg-white">
                    <img
                      src={resolveMediaUrl(formData.image)}
                      alt="Preview Banner"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-full h-24 rounded-2xl border border-dashed border-slate-300 bg-white flex items-center justify-center text-xs font-bold text-slate-400">
                    Belum ada gambar banner
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Atau isi URL manual</label>
                  <input
                    required
                    value={formData.image}
                    onChange={e => setFormData({ ...formData, image: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="https://..."
                  />
                  {isUploading && (
                    <p className="mt-1 text-[11px] font-bold text-slate-500">Sedang upload ke ImageKit...</p>
                  )}
                </div>
              </div>
            </div>
            
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Deskripsi Singkat</label>
              <textarea required value={formData.desc} onChange={e => setFormData({...formData, desc: e.target.value})}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none h-24 resize-none" placeholder="Jelaskan detail promo..."></textarea>
            </div>

            <div className="pt-2">
              <button type="submit" disabled={isSubmitting} className="w-full bg-emerald-500 text-white font-black py-4 rounded-xl hover:bg-slate-900 transition-all flex justify-center items-center gap-2 active:scale-95">
                {isSubmitting ? <Loader2 className="animate-spin" /> : (initialData?.id ? 'Simpan Perubahan' : 'Publikasikan Promo')}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
};

export default PromotionModal;
