import React, { useState } from 'react';
import { 
  Search, Plus, Loader2, Percent, Power, Ticket, X, 
  ChevronDown, ChevronUp, Edit, Trash2 
} from 'lucide-react';
// PERBAIKAN: Import usePromotions (bukan usePromo)
import { usePromotions } from '../../../hooks/usePromotions';

const PromoTab = () => {
  // PERBAIKAN: Sesuaikan fungsi dengan usePromotions (savePromo menggantikan add/update)
  const { promos, isLoading, savePromo, deletePromo, togglePromoStatus } = usePromotions();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Accordion State
  const [expandedId, setExpandedId] = useState(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' atau 'edit'
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ code: '', discount_percent: '', max_discount: '', usage_limit: 0 });

  const filteredPromos = promos.filter(p => p.code.toLowerCase().includes(searchTerm.toLowerCase()));

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const openAddModal = () => {
    setModalMode('add');
    setFormData({ code: '', discount_percent: '', max_discount: '', usage_limit: 0 });
    setIsModalOpen(true);
  };

  const openEditModal = (promo) => {
    setModalMode('edit');
    setEditingId(promo.id);
    setFormData({ 
      code: promo.code, 
      discount_percent: promo.discount_percent, 
      max_discount: promo.max_discount, 
      usage_limit: promo.usage_limit 
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // PERBAIKAN: Gunakan savePromo yang menangani Add maupun Edit
    const success = await savePromo(formData, modalMode === 'edit' ? editingId : null);

    if (success) {
      setIsModalOpen(false);
      setFormData({ code: '', discount_percent: '', max_discount: '', usage_limit: 0 });
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id, code) => {
    // Fungsi confirm sudah ada di dalam hook usePromotions, 
    // tapi jika ingin custom message dengan nama kode:
    if (window.confirm(`Apakah Anda yakin ingin menghapus promo ${code}?`)) {
      await deletePromo(id);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between bg-gray-50/50">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Cari kode promo..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none" 
            />
          </div>
          <button 
            onClick={openAddModal} 
            className="bg-emerald-500 text-white px-5 py-3 sm:py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-600 transition-colors shadow-sm"
          >
            <Plus size={18} /> Buat Promo
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center p-20"><Loader2 className="animate-spin text-emerald-500" size={40} /></div>
        ) : (
          <div className="p-5 bg-gray-50/30">
            {filteredPromos.length === 0 ? (
              <div className="text-center p-10 text-gray-400 font-bold bg-white rounded-2xl border border-dashed border-gray-200">
                Tidak ada kode promo ditemukan.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredPromos.map((promo) => (
                  <div key={promo.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col">
                    
                    <div 
                      onClick={() => toggleExpand(promo.id)}
                      className="p-5 cursor-pointer flex items-center justify-between hover:bg-emerald-50/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-black text-brand-dark bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                          {promo.code}
                        </span>
                        <span className="font-black text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-md text-sm">
                          {promo.discount_percent}<Percent size={14}/>
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-2.5 py-1 font-black text-[10px] uppercase tracking-widest rounded-lg ${promo.is_active === 1 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {promo.is_active === 1 ? 'Aktif' : 'Nonaktif'}
                        </span>
                        <div className="text-gray-400 bg-gray-50 p-1.5 rounded-full">
                          {expandedId === promo.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                      </div>
                    </div>

                    {expandedId === promo.id && (
                      <div className="px-5 pb-5 pt-2 border-t border-gray-100 bg-gray-50/50 animate-fade-in">
                        <div className="grid grid-cols-2 gap-4 mb-5 bg-white p-4 rounded-xl border border-gray-100">
                          <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Maks. Potongan</p>
                            <p className="font-bold text-brand-dark text-sm">
                              Rp {promo.max_discount ? Number(promo.max_discount).toLocaleString('id-ID') : 'Tanpa Batas'}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Terpakai / Kuota</p>
                            <p className="font-bold text-slate-600 text-sm">
                              {promo.current_usage || 0} / {promo.usage_limit === 0 ? '∞' : promo.usage_limit}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <button 
                            onClick={() => togglePromoStatus(promo.id, promo.is_active)} 
                            className={`flex-1 py-2.5 rounded-xl font-bold text-xs inline-flex items-center justify-center gap-2 transition-colors border ${promo.is_active === 1 ? 'bg-white border-red-200 text-red-600 hover:bg-red-50' : 'bg-white border-emerald-200 text-emerald-600 hover:bg-emerald-50'}`}
                          >
                            <Power size={14} /> {promo.is_active === 1 ? 'Nonaktifkan' : 'Aktifkan'}
                          </button>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => openEditModal(promo)}
                              className="p-2.5 bg-white border border-blue-200 text-blue-600 rounded-xl hover:bg-blue-50 transition-colors"
                              title="Edit Promo"
                            >
                              <Edit size={16} />
                            </button>
                            <button 
                              onClick={() => handleDelete(promo.id, promo.code)}
                              className="p-2.5 bg-white border border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition-colors"
                              title="Hapus Promo"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up">
            <div className={`p-6 flex justify-between items-center text-white ${modalMode === 'add' ? 'bg-emerald-500' : 'bg-blue-500'}`}>
              <h3 className="font-black text-xl flex items-center gap-2">
                {modalMode === 'add' ? <><Ticket /> Buat Kode Promo</> : <><Edit /> Edit Kode Promo</>}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-white/80 hover:text-white"><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Kode Voucher</label>
                <input 
                  type="text" 
                  required 
                  value={formData.code} 
                  onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})} 
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-black tracking-widest uppercase focus:ring-2 focus:ring-emerald-500 outline-none" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Diskon (%)</label>
                  <input 
                    type="number" 
                    required min="1" max="100" 
                    value={formData.discount_percent} 
                    onChange={(e) => setFormData({...formData, discount_percent: e.target.value})} 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500 outline-none" 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Batas Penggunaan</label>
                  <input 
                    type="number" 
                    required min="0" 
                    placeholder="0 = Unlimited" 
                    value={formData.usage_limit} 
                    onChange={(e) => setFormData({...formData, usage_limit: e.target.value})} 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500 outline-none" 
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Maksimal Potongan (Rp)</label>
                <input 
                  type="number" 
                  required min="0" 
                  value={formData.max_discount} 
                  onChange={(e) => setFormData({...formData, max_discount: e.target.value})} 
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500 outline-none" 
                />
              </div>
              <button 
                type="submit" 
                disabled={isSubmitting} 
                className={`w-full pt-4 mt-2 text-white font-black py-4 rounded-xl transition-colors flex justify-center gap-2 ${modalMode === 'add' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-blue-500 hover:bg-blue-600'}`}
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : (modalMode === 'add' ? 'Simpan Promo' : 'Update Promo')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromoTab;