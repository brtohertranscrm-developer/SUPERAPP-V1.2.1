import React, { useState, useEffect } from 'react';
import { CalendarDays, Plus, Trash2, Save } from 'lucide-react';

const SeasonalTab = () => {
  const [seasonalRules, setSeasonalRules] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL?.trim() || '';
  
  // PERBAIKAN 1: Buat fungsi untuk menarik token secara dinamis
  const getAuthToken = () => {
    return localStorage.getItem('token') || localStorage.getItem('admin_token');
  };

  // 1. Ambil data dari backend saat tab kalender dibuka
  useEffect(() => {
    const token = getAuthToken(); // PERBAIKAN 2: Tarik token segar di dalam useEffect

    fetch(`${API_URL}/api/admin/pricing/seasonal`, {
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      }
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        // Konversi key database ke state frontend
        const formatted = data.data.map(r => ({
          id: r.id, 
          name: r.name, 
          startDate: r.start_date, 
          endDate: r.end_date, 
          markup: r.markup_percentage
        }));
        setSeasonalRules(formatted);
      }
    })
    .catch(err => console.error("Gagal load data seasonal:", err));
  }, [API_URL]); // Hilangkan token dari array dependency

  const handleAddEvent = () => {
    setSeasonalRules([...seasonalRules, { id: Date.now(), name: '', startDate: '', endDate: '', markup: 0 }]);
  };

  const handleRemoveEvent = (id) => { 
    if(window.confirm('Yakin ingin menghapus event ini?')) {
      setSeasonalRules(seasonalRules.filter(r => r.id !== id)); 
    }
  };

  // 2. Simpan input user ke state React agar tidak hilang
  const handleChange = (id, field, value) => {
    setSeasonalRules(rules => rules.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  // 3. Simpan data permanen ke backend
  const handleSave = async () => {
    setIsLoading(true);
    try {
      const token = getAuthToken(); // PERBAIKAN 3: Tarik token segar sesaat sebelum menyimpan

      const res = await fetch(`${API_URL}/api/admin/pricing/seasonal`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ rules: seasonalRules })
      });
      const result = await res.json();
      if (result.success) {
        alert('✅ Kalender Event BAR berhasil disimpan ke Database!');
      } else {
        alert('❌ Gagal menyimpan: ' + (result.error || result.message));
      }
    } catch (error) {
      console.error(error);
      alert('Terjadi kesalahan koneksi server');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-blue-50 border border-blue-200 p-5 rounded-2xl flex items-start gap-4">
        <CalendarDays className="text-blue-600 shrink-0 mt-0.5" size={24} />
        <div>
          <h3 className="font-bold text-blue-900 mb-1">Custom Best Available Rate (BAR)</h3>
          <p className="text-sm text-blue-800 leading-relaxed">Tetapkan persentase kenaikan harga untuk tanggal khusus. Aturan ini akan meng-override harga dasar.</p>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-lg font-bold text-brand-dark">Event & Liburan Nasional</h2>
          <button onClick={handleAddEvent} className="w-full sm:w-auto bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold px-4 py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"><Plus size={16}/> Tambah Event</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {seasonalRules.map(rule => (
            <div key={rule.id} className="border border-gray-200 rounded-2xl p-5 hover:border-blue-300 transition-colors bg-white shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <input 
                  type="text" 
                  value={rule.name} 
                  onChange={(e) => handleChange(rule.id, 'name', e.target.value)}
                  placeholder="Nama Event..." 
                  className="font-bold text-brand-dark border-b border-dashed border-gray-300 focus:border-blue-600 outline-none pb-1 bg-transparent flex-grow mr-4" 
                />
                <button onClick={() => handleRemoveEvent(rule.id)} className="text-red-400 hover:text-red-600 p-1 bg-red-50 rounded-lg"><Trash2 size={16}/></button>
              </div>
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-sm gap-2">
                  <span className="text-gray-500 font-bold shrink-0">Periode:</span>
                  <div className="flex flex-col sm:flex-row items-center gap-2 w-full">
                    <input 
                      type="date" 
                      value={rule.startDate} 
                      onChange={(e) => handleChange(rule.id, 'startDate', e.target.value)}
                      className="p-1.5 bg-gray-50 rounded-lg border border-gray-200 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 w-full" 
                    />
                    <span className="text-gray-400 font-bold hidden sm:inline">-</span>
                    <input 
                      type="date" 
                      value={rule.endDate} 
                      onChange={(e) => handleChange(rule.id, 'endDate', e.target.value)}
                      className="p-1.5 bg-gray-50 rounded-lg border border-gray-200 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 w-full" 
                    />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-sm pt-4 border-t border-gray-100 gap-2">
                  <span className="text-gray-500 font-bold">Kenaikan Harga:</span>
                  <div className="relative w-full sm:w-auto">
                    <input 
                      type="number" 
                      value={rule.markup} 
                      onChange={(e) => handleChange(rule.id, 'markup', Number(e.target.value))}
                      className="w-full sm:w-20 pl-3 pr-6 py-1.5 text-right font-black text-blue-600 bg-blue-50 rounded-lg border border-blue-200 outline-none focus:ring-2 focus:ring-blue-500" 
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-blue-600 text-xs">%</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {seasonalRules.length === 0 && (
            <div className="col-span-full py-10 text-center text-gray-400 font-bold border-2 border-dashed border-gray-100 rounded-2xl">
              Belum ada event yang dijadwalkan. Klik "Tambah Event" untuk memulai.
            </div>
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
          <button 
            onClick={handleSave} 
            disabled={isLoading}
            className="bg-blue-600 text-white font-bold px-8 py-4 sm:py-3.5 rounded-xl shadow-md hover:bg-blue-700 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <Save size={18}/> {isLoading ? 'Menyimpan...' : 'Simpan Kalender'}
          </button>
        </div>
      </div>
    </div>
  );
};
export default SeasonalTab;