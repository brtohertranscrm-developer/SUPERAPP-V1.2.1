import React, { useState, useEffect } from 'react';
import { Ticket, X, Loader2 } from 'lucide-react';

const PromotionModal = ({ onClose, onSubmit, initialData }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '', code: '', image: '', desc: '', tag: 'Diskon'
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        code: initialData.code || '',
        image: initialData.image || '',
        desc: initialData.desc || '',
        tag: initialData.tag || 'Diskon'
      });
    }
  }, [initialData]);

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

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">URL Gambar Banner</label>
              <input required value={formData.image} onChange={e => setFormData({...formData, image: e.target.value})}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="https://..." />
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