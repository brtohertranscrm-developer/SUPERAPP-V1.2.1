import React, { useState } from 'react';
import { Pencil, Trash2, ChevronDown, ChevronUp, Package, Lock, Plus, X } from 'lucide-react';

const fmtRp = (n) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;

const TYPE_MAP = {
  terbuka:  { label: 'Rak Terbuka',  cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', Icon: Package },
  tertutup: { label: 'Rak Tertutup', cls: 'bg-blue-50 text-blue-700 border-blue-200',         Icon: Lock }
};

// Sub-komponen form addon inline
const AddonForm = ({ onSubmit, onCancel, initialData }) => {
  const [form, setForm] = useState({
    name: initialData?.name || '',
    description: initialData?.description || '',
    price: initialData?.price || '',
    addon_type: initialData?.addon_type || 'pickup',
    is_active: initialData?.is_active !== undefined ? initialData.is_active : 1
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ ...form, price: parseInt(form.price), is_active: form.is_active ? 1 : 0 });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Nama Layanan</label>
          <input type="text" value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} required
            placeholder="Antar ke loker" className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tipe</label>
          <select value={form.addon_type} onChange={e => setForm(p => ({...p, addon_type: e.target.value}))}
            className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none">
            <option value="pickup">Pickup (Ambil barang)</option>
            <option value="drop">Drop (Antar barang)</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Harga (Rp)</label>
          <input type="number" value={form.price} onChange={e => setForm(p => ({...p, price: e.target.value}))} required min="0"
            placeholder="15000" className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Deskripsi</label>
          <input type="text" value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))}
            placeholder="Opsional" className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-3 py-1.5 text-xs font-bold text-slate-500 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">Batal</button>
        <button type="submit" className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700">Simpan Addon</button>
      </div>
    </form>
  );
};

const LokerTable = ({
  data, isLoading,
  onEdit, onDelete,
  addons, onAddAddon, onEditAddon, onDeleteAddon,
  activeTab = 'loker'
}) => {
  const [expandedId, setExpandedId] = useState(null);
  const [showAddonForm, setShowAddonForm] = useState(false);
  const [editingAddon, setEditingAddon] = useState(null);

  const toggleExpand = (id) => setExpandedId(expandedId === id ? null : id);

  // Grup loker by type
  const grouped = { terbuka: [], tertutup: [] };
  data.forEach(l => { if (grouped[l.type]) grouped[l.type].push(l); });

  if (isLoading) return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 text-center text-slate-400 font-bold">
      Memuat data loker...
    </div>
  );

  return (
    <div className="space-y-6">

      {/* Section per tipe — hanya tampil di tab loker */}
      {activeTab === 'loker' && ['terbuka', 'tertutup'].map((type) => {
        const items = grouped[type] || [];
        const { label, cls, Icon } = TYPE_MAP[type];
        return (
          <div key={type}>
            <div className="flex items-center gap-2 mb-3">
              <Icon size={16} className="text-slate-500" />
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">{label}</h3>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${cls}`}>{items.length} unit</span>
            </div>

            {items.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-6 text-center text-slate-400 text-sm">
                Belum ada loker {type}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((l) => {
                  const isExpanded = expandedId === l.id;
                  return (
                    <div key={l.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all">
                      <div onClick={() => toggleExpand(l.id)} className="p-4 cursor-pointer hover:bg-slate-50 flex items-center justify-between transition-colors">
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">{l.location}</p>
                          <p className="text-sm font-black text-slate-800 capitalize">{l.type}</p>
                          {l.dimensions && <p className="text-[11px] text-slate-400">{l.dimensions} cm</p>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black border ${cls}`}>
                            {l.stock} unit
                          </span>
                          {isExpanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="border-t border-slate-100 animate-in slide-in-from-top-2 fade-in duration-200">
                          {/* Harga */}
                          <div className="p-4 grid grid-cols-3 gap-2">
                            {[
                              { l: '1 Jam', v: l.price_1h },
                              { l: '12 Jam', v: l.price_12h },
                              { l: '24 Jam', v: l.price_24h }
                            ].map(p => (
                              <div key={p.l} className="bg-slate-50 rounded-xl p-2 border border-slate-100 text-center">
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{p.l}</p>
                                <p className="text-xs font-black text-slate-700 mt-0.5">{fmtRp(p.v)}</p>
                              </div>
                            ))}
                          </div>
                          {/* Aksi */}
                          <div className="p-3 bg-slate-50 border-t border-slate-100 flex gap-2">
                            <button onClick={() => onEdit(l)}
                              className="flex-1 bg-white border border-slate-200 text-slate-600 font-bold py-2 rounded-xl text-xs hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-colors flex justify-center items-center gap-1.5">
                              <Pencil size={13} /> Edit
                            </button>
                            <button onClick={() => onDelete(l.id)}
                              className="flex-1 bg-white border border-red-200 text-red-500 font-bold py-2 rounded-xl text-xs hover:bg-red-50 transition-colors flex justify-center items-center gap-1.5">
                              <Trash2 size={13} /> Hapus
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Section Addon Pickup & Drop — hanya tampil di tab addon */}
      {activeTab === 'addon' && (
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Layanan Pickup &amp; Drop</h3>
          <button onClick={() => { setShowAddonForm(true); setEditingAddon(null); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700 transition-colors shadow-sm">
            <Plus size={13} /> Tambah Layanan
          </button>
        </div>

        {showAddonForm && !editingAddon && (
          <div className="mb-4">
            <AddonForm
              onSubmit={async (data) => { await onAddAddon(data); setShowAddonForm(false); }}
              onCancel={() => setShowAddonForm(false)}
            />
          </div>
        )}

        {addons.length === 0 && !showAddonForm ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-6 text-center text-slate-400 text-sm">
            Belum ada layanan pickup atau drop
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {addons.map((a) => (
              <div key={a.id}>
                {editingAddon?.id === a.id ? (
                  <AddonForm
                    initialData={a}
                    onSubmit={async (data) => { await onEditAddon(a.id, data); setEditingAddon(null); }}
                    onCancel={() => setEditingAddon(null)}
                  />
                ) : (
                  <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
                    <div className="flex-1 overflow-hidden">
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border ${
                          a.addon_type === 'pickup' ? 'bg-purple-50 text-purple-600 border-purple-200' : 'bg-orange-50 text-orange-600 border-orange-200'
                        }`}>{a.addon_type}</span>
                        <span className={`w-2 h-2 rounded-full ${a.is_active ? 'bg-emerald-400' : 'bg-slate-300'}`} title={a.is_active ? 'Aktif' : 'Nonaktif'} />
                      </div>
                      <p className="text-sm font-black text-slate-800 mt-1 truncate">{a.name}</p>
                      <p className="text-xs font-bold text-slate-500">{fmtRp(a.price)}</p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button onClick={() => setEditingAddon(a)} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><Pencil size={14} /></button>
                      <button onClick={() => onDeleteAddon(a.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      )}

    </div>
  );
};

export default LokerTable;
