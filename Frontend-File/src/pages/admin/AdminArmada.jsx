import React, { useState } from 'react';
import { useArmada } from '../../hooks/useArmada';
import ArmadaTable from '../../components/admin/armada/ArmadaTable';
import ArmadaModal from '../../components/admin/armada/ArmadaModal';
import UnitModal from '../../components/admin/armada/UnitModal'; // IMPORT BARU

const AdminArmada = () => {
  const { armada, loading, addArmada, editArmada, deleteArmada, fetchUnits, addUnit, updateUnit, deleteUnit } = useArmada();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingData, setEditingData] = useState(null);
  
  // State untuk Manajemen Plat Nomor
  const [managingUnitMotor, setManagingUnitMotor] = useState(null);

  const handleOpenAdd = () => { setEditingData(null); setIsModalOpen(true); };
  const handleOpenEdit = (motor) => { setEditingData(motor); setIsModalOpen(true); };
  const handleOpenUnit = (motor) => { setManagingUnitMotor(motor); }; // BUKA MODAL PLAT

  const handleModalSubmit = (formData) => {
    if (editingData) editArmada(editingData.id, formData);
    else addArmada(formData);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manajemen Armada</h1>
        <button onClick={handleOpenAdd} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold shadow hover:bg-blue-700 transition-colors">
          + Tambah Katalog Motor
        </button>
      </div>

      {loading ? (
        <p className="text-slate-500 font-bold">Loading data...</p>
      ) : (
        <ArmadaTable 
          data={armada} 
          onEdit={handleOpenEdit} 
          onDelete={deleteArmada}
          onManageUnit={handleOpenUnit} // OPER FUNGSI KE TABEL
        />
      )}

      {isModalOpen && (
        <ArmadaModal initialData={editingData} onClose={() => setIsModalOpen(false)} onSubmit={handleModalSubmit} />
      )}

      {/* RENDER MODAL PLAT NOMOR JIKA ADA MOTOR YANG DIPILIH */}
      {managingUnitMotor && (
        <UnitModal 
          motor={managingUnitMotor} 
          onClose={() => setManagingUnitMotor(null)}
          fetchUnits={fetchUnits} addUnit={addUnit} updateUnit={updateUnit} deleteUnit={deleteUnit}
        />
      )}
    </div>
  );
};

export default AdminArmada;