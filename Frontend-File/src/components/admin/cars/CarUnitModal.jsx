import React, { useEffect, useState } from 'react';
import { Key, Plus, Trash2, X } from 'lucide-react';

const LOCATIONS = ['Yogyakarta', 'Solo', 'Semarang', 'Nasional'];

export default function CarUnitModal({ car, onClose, fetchUnits, addUnit, updateUnit, deleteUnit }) {
  const [units, setUnits] = useState([]);
  const [newPlate, setNewPlate] = useState('');
  const [newLoc, setNewLoc] = useState('Yogyakarta');
  const [isLoading, setIsLoading] = useState(true);

  const loadUnits = async () => {
    setIsLoading(true);
    const data = await fetchUnits(car.id);
    setUnits(Array.isArray(data) ? data : []);
    setIsLoading(false);
  };

  useEffect(() => { if (car) loadUnits(); }, [car]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newPlate.trim()) return;
    await addUnit(car.id, {
      plate_number: newPlate.toUpperCase(),
      status: 'RDY',
      current_location: newLoc,
    });
    setNewPlate('');
    loadUnits();
  };

  const handleUpdate = async (unit, patch) => {
    await updateUnit(unit.id, {
      plate_number: patch.plate_number ?? unit.plate_number,
      status: patch.status ?? unit.status,
      current_location: patch.current_location ?? unit.current_location,
      condition_notes: patch.condition_notes ?? unit.condition_notes,
    });
    loadUnits();
  };

  const handleDelete = async (unitId) => {
    const ok = await deleteUnit(unitId);
    if (ok) loadUnits();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <Key size={22} className="text-rose-500" /> Kelola Unit Mobil (Plat)
            </h2>
            <p className="text-sm font-bold text-slate-500 mt-1">{car.display_name || car.name}</p>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white">
          <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              value={newPlate}
              onChange={(e) => setNewPlate(e.target.value)}
              placeholder="Plat Baru (Cth: AB 1234 XYZ)"
              className="sm:col-span-2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase outline-none"
            />
            <div className="flex gap-2">
              <select
                value={newLoc}
                onChange={(e) => setNewLoc(e.target.value)}
                className="flex-1 px-3 py-3 bg-white border border-slate-200 rounded-xl font-bold text-sm outline-none"
                title="Lokasi awal unit"
              >
                {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
              <button
                type="submit"
                className="px-4 py-3 bg-rose-500 hover:bg-rose-600 text-white font-black rounded-xl flex items-center gap-2"
              >
                <Plus size={18} /> Tambah
              </button>
            </div>
          </form>

          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-black text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="p-4">Plat</th>
                  <th className="p-4 text-center">Lokasi</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr><td colSpan={4} className="p-8 text-center text-slate-400 font-medium">Memuat data...</td></tr>
                ) : units.length === 0 ? (
                  <tr><td colSpan={4} className="p-8 text-center text-slate-400 font-medium">Belum ada unit terdaftar.</td></tr>
                ) : (
                  units.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/50">
                      <td className="p-4 font-mono font-black text-slate-800">{u.plate_number}</td>
                      <td className="p-4">
                        <select
                          value={u.current_location || 'Yogyakarta'}
                          onChange={(e) => handleUpdate(u, { current_location: e.target.value })}
                          className="w-full text-xs font-bold bg-white border border-slate-200 rounded-lg px-2 py-2 outline-none"
                        >
                          {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
                        </select>
                      </td>
                      <td className="p-4">
                        <select
                          value={u.status || 'RDY'}
                          onChange={(e) => handleUpdate(u, { status: e.target.value })}
                          className="w-full text-xs font-bold bg-white border border-slate-200 rounded-lg px-2 py-2 outline-none"
                        >
                          <option value="RDY">🟢 RDY (Siap)</option>
                          <option value="RNT">🔵 RNT (Disewa)</option>
                          <option value="DRT">🟡 DRT (Cek/Cuci)</option>
                          <option value="MNT">🔴 MNT (Bengkel)</option>
                        </select>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleDelete(u.id)}
                          className="w-8 h-8 inline-flex items-center justify-center bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-lg"
                          title="Hapus unit"
                        >
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
}

