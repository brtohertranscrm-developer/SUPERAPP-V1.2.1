import React, { useState, useEffect } from 'react';
import { AlertTriangle, Save, Loader2 } from 'lucide-react';

const SurgeTab = () => {
  const [surgeConfig, setSurgeConfig] = useState({ isActive: false, multiplier: 0, triggerStock: 0 });
  const [isSaving, setIsSaving] = useState(false);
  const token = localStorage.getItem('token');
  const API_URL = import.meta.env.VITE_API_URL?.trim() || '';

  // Ambil data asli dari database saat halaman dibuka
  useEffect(() => {
    fetch(`${API_URL}/api/admin/pricing/surge`, { // Ubah disini
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(result => {
      if (result.success && result.data) {
        setSurgeConfig({
          isActive: result.data.is_active === 1,
          multiplier: result.data.markup_percentage || 0,
          triggerStock: result.data.stock_condition || 0
        });
      }
    })
    .catch(err => console.error("Gagal load data surge:", err));
  }, [token, API_URL]);

  // Fungsi untuk mengirim data ke database
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/admin/pricing/surge`, { // Ubah disini
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          is_active: surgeConfig.isActive ? 1 : 0, 
          markup_percentage: surgeConfig.multiplier,
          stock_condition: surgeConfig.triggerStock
        })
      });
      
      const result = await response.json();
      if (result.success) {
        alert('✅ Konfigurasi Surge Pricing berhasil disimpan ke Sistem!');
      } else {
        alert('Gagal menyimpan konfigurasi.');
      }
    } catch (error) {
      console.error(error);
      alert('Terjadi kesalahan jaringan.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
      <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-gray-100">
        <div className="flex items-start gap-4 mb-6 pb-6 border-b border-gray-100">
          <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center shrink-0">
            <AlertTriangle size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black text-brand-dark mb-1">Surge Pricing (Scarcity)</h3>
            <p className="text-gray-500 text-sm">Harga akan naik secara otomatis berdasarkan algoritma ketersediaan sisa armada/loker di lapangan.</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-bold text-brand-dark">Status Algoritma</div>
              <div className="text-xs text-gray-400 font-medium">Nyalakan/matikan sistem harga dinamis stok.</div>
            </div>
            {/* Bagian Toggle UI */}
            <button 
              onClick={() => setSurgeConfig({...surgeConfig, isActive: !surgeConfig.isActive})}
              className={`w-14 h-8 rounded-full flex items-center p-1 transition-colors ${surgeConfig.isActive ? 'bg-amber-500' : 'bg-gray-300'}`}
            >
              <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${surgeConfig.isActive ? 'translate-x-6' : 'translate-x-0'}`}></div>
            </button>
          </div>

          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Persentase Ekstra Kenaikan Harga</label>
            <div className="flex items-center gap-3">
              <input 
                type="number" 
                value={surgeConfig.multiplier} 
                onChange={(e) => setSurgeConfig({...surgeConfig, multiplier: parseInt(e.target.value) || 0})} 
                disabled={!surgeConfig.isActive} 
                className="w-24 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-black text-lg text-brand-dark focus:ring-2 focus:ring-amber-500 outline-none disabled:opacity-50 text-center" 
              />
              <span className="font-black text-gray-400 text-xl">%</span>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Pemicu Sistem (Sisa Stok)</label>
            <div className="flex items-center gap-3">
              <span className="font-bold text-gray-500 text-sm">Aktif jika sisa stok &le; </span>
              <input 
                type="number" 
                value={surgeConfig.triggerStock} 
                onChange={(e) => setSurgeConfig({...surgeConfig, triggerStock: parseInt(e.target.value) || 0})} 
                disabled={!surgeConfig.isActive} 
                className="w-20 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl font-black text-brand-dark focus:ring-2 focus:ring-amber-500 outline-none disabled:opacity-50 text-center" 
              />
              <span className="font-bold text-gray-500 text-sm">Unit</span>
            </div>
          </div>

          {/* PERBAIKAN 2: Jangan disable tombol simpan saat saklar dimatikan! */}
          <button 
            disabled={isSaving} 
            onClick={handleSave} 
            className="w-full bg-brand-dark text-white font-black py-4 rounded-xl hover:bg-amber-500 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
          >
            {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            {isSaving ? 'Menyimpan...' : 'Simpan Konfigurasi'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SurgeTab;
