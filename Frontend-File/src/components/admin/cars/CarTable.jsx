import React from 'react';
import { Pencil, Trash2, Key } from 'lucide-react';

const badge = (text) => (
  <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black uppercase tracking-widest">
    {text}
  </span>
);

export default function CarTable({ data, onEdit, onDelete, onManageUnit }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs font-black text-slate-500 uppercase tracking-wider">
            <tr>
              <th className="p-4">Mobil</th>
              <th className="p-4">Kategori</th>
              <th className="p-4 text-center">Unit Ready</th>
              <th className="p-4 text-center">Total Unit</th>
              <th className="p-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(data || []).length === 0 ? (
              <tr>
                <td colSpan={5} className="p-10 text-center text-slate-400 font-bold">
                  Belum ada katalog mobil.
                </td>
              </tr>
            ) : (
              data.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/60">
                  <td className="p-4">
                    <div className="font-black text-slate-900">{c.display_name || c.name}</div>
                    <div className="text-xs text-slate-500 font-bold mt-1">
                      {badge(`${(c.transmission || 'AT').toUpperCase()} • ${c.seats || 5} kursi`)}
                    </div>
                  </td>
                  <td className="p-4 text-sm font-bold text-slate-700">{c.category || 'Car'}</td>
                  <td className="p-4 text-center font-black text-slate-900">{c.active_stock ?? c.stock ?? 0}</td>
                  <td className="p-4 text-center font-black text-slate-900">{c.total_units ?? 0}</td>
                  <td className="p-4 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onManageUnit?.(c)}
                        className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900"
                        title="Kelola Unit (Plat)"
                      >
                        <Key size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onEdit?.(c)}
                        className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200"
                        title="Edit katalog"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete?.(c.id)}
                        className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-600 hover:text-white"
                        title="Hapus katalog"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

