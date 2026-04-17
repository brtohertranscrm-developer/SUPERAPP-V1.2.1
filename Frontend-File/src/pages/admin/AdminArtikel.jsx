import React, { useState } from 'react';
import { useArtikel } from '../../hooks/useArtikel';
import ArtikelTable from '../../components/admin/artikel/ArtikelTable';
import ArtikelModal from '../../components/admin/artikel/ArtikelModal';

const AdminArtikel = () => {
  const { artikel, loading, addArtikel, editArtikel, deleteArtikel } = useArtikel();
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

  const handleModalSubmit = (formData) => {
    if (editingData) {
      editArtikel(editingData.id, formData);
    } else {
      addArtikel(formData);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manajemen Artikel / Blog</h1>
        <button onClick={handleOpenAdd} className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700">
          + Tulis Artikel
        </button>
      </div>

      {loading ? (
        <p>Loading data...</p>
      ) : (
        <ArtikelTable 
          data={artikel} 
          onEdit={handleOpenEdit} 
          onDelete={deleteArtikel} 
        />
      )}

      {isModalOpen && (
        <ArtikelModal 
          initialData={editingData}
          onClose={() => setIsModalOpen(false)} 
          onSubmit={handleModalSubmit} 
        />
      )}
    </div>
  );
};

export default AdminArtikel;