import React, { useState } from 'react';
import { Gift, Plus } from 'lucide-react';
import { useAdminMilesRewards } from '../../hooks/useAdminMilesRewards';
import MilesRewardsList from '../../components/admin/milesRewards/MilesRewardsList';
import MilesRewardModal from '../../components/admin/milesRewards/MilesRewardModal';

export default function AdminMilesRewards() {
  const { rewards, isLoading, saveReward, deleteReward, toggleReward } = useAdminMilesRewards();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const openAdd = () => {
    setEditing(null);
    setIsModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setIsModalOpen(true);
  };

  return (
    <div className="animate-fade-in-up pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Gift className="text-emerald-500" /> Miles Rewards
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-1">
            Kelola semua reward penukaran Miles (jenis, rule, masa berlaku, dan scope).
          </p>
        </div>
        <button
          onClick={openAdd}
          className="w-full sm:w-auto bg-slate-900 text-white px-5 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-500 transition-all shadow-lg active:scale-95"
        >
          <Plus size={18} /> Tambah Reward
        </button>
      </div>

      <MilesRewardsList
        rewards={rewards}
        isLoading={isLoading}
        onEdit={openEdit}
        onDelete={deleteReward}
        onToggle={toggleReward}
      />

      {isModalOpen && (
        <MilesRewardModal
          initialData={editing}
          onClose={() => setIsModalOpen(false)}
          onSubmit={saveReward}
        />
      )}
    </div>
  );
}

