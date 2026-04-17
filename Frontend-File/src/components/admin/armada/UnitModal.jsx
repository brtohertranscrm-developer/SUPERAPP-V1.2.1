import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Key } from 'lucide-react';

const UnitModal = ({ motor, onClose, fetchUnits, addUnit, updateUnit, deleteUnit }) => {
  const [units, setUnits] = useState([]);
  const [newPlate, setNewPlate] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadUnits = async () => {
    setIsLoading(true);
    const data = await fetchUnits(motor.id);
    setUnits(data);
    setIsLoading(false);
  };

  useEffect(() => { if (motor) loadUnits(); }, [motor]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newPlate.trim()) return;
    await addUnit(motor.id, { plate_number: newPlate.toUpperCase(), status: 'RDY' });
    setNewPlate('');
    loadUnits();
  };

  const handleStatusChange = async (unit, newStatus) => {
    await updateUnit(unit.id, { plate_number: unit.plate_number, status: newStatus });
    loadUnits();
  };

  const handleDelete = async (unitId) => {
    const success = await deleteUnit(unitId);
    if (success) loadUnits();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <Key size={24} className="text-blue-500" /> Kelola Plat Nomor
            </h2>
            <p className="text-sm font-bold text-slate-500 mt-1">{motor.name} - {motor.location}</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white">
          
          {/* Form Tambah Plat */}
          <form onSubmit={handleAdd} className="flex gap-3">
            <input 
              type="text" 
              value={newPlate}
              onChange={(e) => setNewPlate(e.target.value)}
              placeholder="Plat Baru (Cth: AB 1234 XYZ)"
              className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <button type="submit" className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center gap-2">
              <Plus size={18} /> Tambah
            </button>
          </form>

          {/* List Plat Nomor */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="p-4">Plat Nomor</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">Ubah Status</th>
                  <th className="p-4 text-right">Hapus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr><td colSpan="4" className="p-8 text-center text-slate-400 font-medium">Memuat data...</td></tr>
                ) : units.length === 0 ? (
                  <tr><td colSpan="4" className="p-8 text-center text-slate-400 font-medium">Belum ada plat nomor terdaftar.</td></tr>
                ) : (
                  units.map(unit => (
                    <tr key={unit.id} className="hover:bg-slate-50/50">
                      <td className="p-4 font-mono font-black text-slate-800">{unit.plate_number}</td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg border
                          ${unit.status === 'RDY' ? 'bg-green-50 text-green-600 border-green-200' : 
                            unit.status === 'RNT' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                            unit.status === 'DRT' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                            'bg-red-50 text-red-600 border-red-200'}`}>
                          {unit.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex justify-center">
                          <select 
                            value={unit.status} 
                            onChange={(e) => handleStatusChange(unit, e.target.value)}
                            className="text-xs font-bold bg-white border border-slate-200 rounded-lg px-2 py-1.5 outline-none hover:border-slate-300"
                          >
                            <option value="RDY">🟢 RDY (Siap Pakai)</option>
                            <option value="RNT">🔵 RNT (Disewa)</option>
                            <option value="DRT">🟡 DRT (Kotor/Cek)</option>
                            <option value="MNT">🔴 MNT (Bengkel)</option>
                          </select>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <button onClick={() => handleDelete(unit.id)} className="w-8 h-8 inline-flex items-center justify-center bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-lg">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnitModal;