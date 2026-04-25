import React, { useMemo, useState } from 'react';
import { Gift, Plus, Calculator } from 'lucide-react';
import { useAdminMilesRewards } from '../../hooks/useAdminMilesRewards';
import MilesRewardsList from '../../components/admin/milesRewards/MilesRewardsList';
import MilesRewardModal from '../../components/admin/milesRewards/MilesRewardModal';

export default function AdminMilesRewards() {
  const { rewards, isLoading, saveReward, deleteReward, toggleReward } = useAdminMilesRewards();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [previewBase, setPreviewBase] = useState(200000);

  const normalizedPreviewBase = useMemo(() => Math.max(0, parseInt(previewBase, 10) || 0), [previewBase]);

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

      {/* Preview simulator */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 mb-6 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center shrink-0">
            <Calculator size={20} />
          </div>
          <div>
            <p className="text-sm font-black text-slate-900">Simulasi Potongan</p>
            <p className="text-xs text-slate-500 font-medium">
              Masukkan subtotal (base sewa) untuk melihat estimasi potongan per reward.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Subtotal (Rp)</label>
          <input
            type="number"
            value={previewBase}
            onChange={(e) => setPreviewBase(e.target.value)}
            className="w-44 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
            min={0}
          />
        </div>
      </div>

      <MilesRewardsList
        rewards={rewards}
        isLoading={isLoading}
        onEdit={openEdit}
        onDelete={deleteReward}
        onToggle={toggleReward}
        previewBase={normalizedPreviewBase}
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
