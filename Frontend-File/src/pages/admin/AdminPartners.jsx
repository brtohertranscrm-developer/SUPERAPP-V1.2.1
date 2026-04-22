import React, { useState } from 'react';
import { Handshake, Plus } from 'lucide-react';
import { usePartnersAdmin } from '../../hooks/usePartnersAdmin';
import PartnersList from '../../components/admin/partners/PartnersList';
import PartnerModal from '../../components/admin/partners/PartnerModal';

export default function AdminPartners() {
  const { partners, isLoading, savePartner, deletePartner, setPartnerActive } = usePartnersAdmin();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingData, setEditingData] = useState(null);

  const openAdd = () => {
    setEditingData(null);
    setIsModalOpen(true);
  };

  const openEdit = (partner) => {
    setEditingData(partner);
    setIsModalOpen(true);
  };

  return (
    <div className="animate-fade-in-up pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Handshake className="text-indigo-600" /> Partnership
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-1">
            Partner (bengkel/toko/wisata) yang tampil di homepage beserta promo singkatnya.
          </p>
        </div>
        <button
          onClick={openAdd}
          className="w-full sm:w-auto bg-slate-900 text-white px-5 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-600 transition-all shadow-lg active:scale-95"
        >
          <Plus size={18} /> Tambah Partner
        </button>
      </div>

      <PartnersList
        partners={partners}
        isLoading={isLoading}
        onEdit={openEdit}
        onDelete={deletePartner}
        onToggleActive={setPartnerActive}
      />

      {isModalOpen && (
        <PartnerModal
          initialData={editingData}
          onClose={() => setIsModalOpen(false)}
          onSubmit={savePartner}
        />
      )}
    </div>
  );
}

