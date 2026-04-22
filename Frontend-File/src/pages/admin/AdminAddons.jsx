import React, { useState } from 'react';
import { PackagePlus, Plus } from 'lucide-react';
import { useMotorAddons } from '../../hooks/useMotorAddons';
import AddonsList from '../../components/admin/addons/AddonsList';
import AddonModal from '../../components/admin/addons/AddonModal';

export default function AdminAddons() {
  const {
    addons,
    isLoading,
    addAddon,
    editAddon,
    deleteAddon,
    unavailableMessage,
  } = useMotorAddons();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingData, setEditingData] = useState(null);

  const handleOpenAdd = () => {
    setEditingData(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingData(item);
    setIsModalOpen(true);
  };

  const handleSubmit = async (payload, id) => {
    if (id) return editAddon(id, payload);
    return addAddon(payload);
  };

  return (
    <div className="animate-fade-in-up pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <PackagePlus className="text-emerald-500" /> Add-ons & Paket
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-1">
            Item upsell yang bisa dipilih customer saat checkout motor.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          disabled={Boolean(unavailableMessage)}
          className="w-full sm:w-auto bg-slate-900 text-white px-5 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-500 transition-all shadow-lg active:scale-95"
        >
          <Plus size={18} /> Tambah Item
        </button>
      </div>

      {unavailableMessage ? (
        <div className="mb-6 rounded-[1.75rem] border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-800">
          {unavailableMessage} Pull update backend terbaru lalu restart service backend untuk mengaktifkan halaman ini.
        </div>
      ) : null}

      <AddonsList
        addons={addons}
        isLoading={isLoading}
        onEdit={handleOpenEdit}
        onDelete={deleteAddon}
      />

      {isModalOpen && (
        <AddonModal
          initialData={editingData}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
