import React, { useState } from 'react';
import { Megaphone, Plus } from 'lucide-react';
import { usePromotions } from '../../hooks/usePromotions';
import PromotionsList from '../../components/admin/promotions/PromotionsList';
import PromotionModal from '../../components/admin/promotions/PromotionModal';

export default function AdminPromotions() {
  const { promos, isLoading, savePromo, deletePromo } = usePromotions();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingData, setEditingData] = useState(null);

  const handleOpenAdd = () => {
    setEditingData(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (promo) => {
    setEditingData(promo);
    setIsModalOpen(true);
  };

  return (
    <div className="animate-fade-in-up pb-10">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Megaphone className="text-emerald-500" /> Konten Promosi
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-1">Kelola banner promo dan voucher untuk menarik pelanggan baru.</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="w-full sm:w-auto bg-slate-900 text-white px-5 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-500 transition-all shadow-lg active:scale-95"
        >
          <Plus size={18} /> Buat Promo Baru
        </button>
      </div>

      {/* LIST PROMO */}
      <PromotionsList 
        promos={promos} 
        isLoading={isLoading} 
        onEdit={handleOpenEdit} 
        onDelete={deletePromo} 
      />

      {/* MODAL FORM PROMO */}
      {isModalOpen && (
        <PromotionModal 
          initialData={editingData}
          onClose={() => setIsModalOpen(false)} 
          onSubmit={savePromo} 
        />
      )}

    </div>
  );
}