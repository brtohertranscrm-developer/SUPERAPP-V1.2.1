import React, { useState } from 'react';
import { Package, Plus, Settings } from 'lucide-react';
import { useLoker, useLokerAddons } from '../../hooks/useLoker';
import LokerTable from '../../components/admin/loker/LokerTable';
import LokerModal from '../../components/admin/loker/LokerModal';

const TABS = [
  { key: 'loker',  label: 'Manajemen Loker', icon: Package },
  { key: 'addon',  label: 'Addon Layanan',   icon: Settings }
];

const AdminLoker = () => {
  const [activeTab, setActiveTab]   = useState('loker');
  const [showModal, setShowModal]   = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const { lokers, isLoading, addLoker, editLoker, deleteLoker }       = useLoker();
  const { addons, isLoading: addonsLoading, addAddon, editAddon, deleteAddon } = useLokerAddons();

  const handleEdit = (item) => {
    setEditingItem(item);
    setShowModal(true);
  };

  const handleClose = () => {
    setEditingItem(null);
    setShowModal(false);
  };

  const handleSubmit = editingItem
    ? (id, payload) => editLoker(id, payload)
    : (payload) => addLoker(payload);

  return (
    <div className="p-4 md:p-6 max-w-screen-xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <Package size={26} className="text-blue-500" />
            Smart Loker
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Kelola rak terbuka, rak tertutup, dan layanan pickup & drop
          </p>
        </div>
        {activeTab === 'loker' && (
          <button
            onClick={() => { setEditingItem(null); setShowModal(true); }}
            className="px-5 py-2.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 shadow-md transition-colors flex items-center gap-2 shrink-0"
          >
            <Plus size={18} /> Tambah Loker
          </button>
        )}
      </div>

      {/* Tab Navigasi */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-1.5 flex gap-1">
        {TABS.map(({ key, label, icon: Icon }) => {
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
              }`}
            >
              <Icon size={16} />
              {label}
              {key === 'loker' && (
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {lokers.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Konten */}
      <LokerTable
        data={activeTab === 'loker' ? lokers : []}
        isLoading={activeTab === 'loker' ? isLoading : addonsLoading}
        onEdit={handleEdit}
        onDelete={deleteLoker}
        addons={addons}
        onAddAddon={addAddon}
        onEditAddon={editAddon}
        onDeleteAddon={deleteAddon}
        activeTab={activeTab}
      />

      {/* Modal */}
      {showModal && (
        <LokerModal
          onClose={handleClose}
          onSubmit={handleSubmit}
          initialData={editingItem}
        />
      )}
    </div>
  );
};

export default AdminLoker;
