import React, { useState } from 'react';
import { useCars } from '../../hooks/useCars';
import CarTable from '../../components/admin/cars/CarTable';
import CarModal from '../../components/admin/cars/CarModal';
import CarUnitModal from '../../components/admin/cars/CarUnitModal';

export default function AdminCars() {
  const {
    cars,
    loading,
    addCar,
    editCar,
    deleteCar,
    fetchUnits,
    addUnit,
    updateUnit,
    deleteUnit,
  } = useCars();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingData, setEditingData] = useState(null);
  const [managingCar, setManagingCar] = useState(null);

  const openAdd = () => { setEditingData(null); setIsModalOpen(true); };
  const openEdit = (car) => { setEditingData(car); setIsModalOpen(true); };

  const handleSubmit = (payload) => {
    if (editingData) editCar(editingData.id, payload);
    else addCar(payload);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Armada Mobil</h1>
          <p className="text-sm text-slate-500 font-bold mt-1">
            Kelola katalog mobil dan unit fisik (plat). Karena mobil bisa lintas kota, lokasi unit ada di setiap plat.
          </p>
        </div>
        <button
          onClick={openAdd}
          className="bg-rose-500 text-white px-4 py-2 rounded-lg font-black shadow hover:bg-rose-600 transition-colors"
          type="button"
        >
          + Tambah Katalog Mobil
        </button>
      </div>

      {loading ? (
        <p className="text-slate-500 font-bold">Loading data...</p>
      ) : (
        <CarTable
          data={cars}
          onEdit={openEdit}
          onDelete={deleteCar}
          onManageUnit={setManagingCar}
        />
      )}

      {isModalOpen && (
        <CarModal
          initialData={editingData}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleSubmit}
        />
      )}

      {managingCar && (
        <CarUnitModal
          car={managingCar}
          onClose={() => setManagingCar(null)}
          fetchUnits={fetchUnits}
          addUnit={addUnit}
          updateUnit={updateUnit}
          deleteUnit={deleteUnit}
        />
      )}
    </div>
  );
}

