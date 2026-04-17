import React, { useState, useEffect } from 'react';
import { X, Upload, Loader2 } from 'lucide-react';

const CATEGORIES = [
  { value: 'servis',    label: 'Servis Armada' },
  { value: 'bbm',       label: 'Bahan Bakar (BBM)' },
  { value: 'sewa',      label: 'Sewa Tempat / Garasi' },
  { value: 'gaji',      label: 'Gaji / Honorarium' },
  { value: 'marketing', label: 'Marketing & Promosi' },
  { value: 'lainnya',   label: 'Lainnya' }
];

const ExpenseModal = ({ onClose, onSubmit, initialData }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fileName, setFileName] = useState('');
  const [formData, setFormData] = useState({
    category: 'servis',
    amount: '',
    description: '',
    expense_date: new Date().toISOString().split('T')[0],
    motor_unit_id: ''
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        category:      initialData.category || 'servis',
        amount:        initialData.amount || '',
        description:   initialData.description || '',
        expense_date:  initialData.expense_date || new Date().toISOString().split('T')[0],
        motor_unit_id: initialData.motor_unit_id || ''
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) setFileName(file.name);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (initialData) {
      // Edit — kirim JSON biasa (tidak ada upload ulang struk di edit)
      const success = await onSubmit(initialData.id, formData);
      if (success) onClose();
    } else {
      // Tambah baru — pakai FormData untuk opsional upload struk
      const fd = new FormData();
      Object.entries(formData).forEach(([k, v]) => { if (v) fd.append(k, v); });
      const fileInput = document.getElementById('receipt-file');
      if (fileInput?.files[0]) fd.append('receipt', fileInput.files[0]);
      const success = await onSubmit(fd);
      if (success) onClose();
    }

    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">

        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-xl font-black text-slate-800">
            {initialData ? 'Edit Pengeluaran' : 'Catat Pengeluaran Baru'}
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-rose-500 rounded-xl hover:bg-rose-50 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 bg-slate-50">

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Kategori</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Tanggal</label>
              <input
                type="date"
                name="expense_date"
                value={formData.expense_date}
                onChange={handleChange}
                required
                className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Nominal (Rp)</label>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              required
              min="1"
              placeholder="150000"
              className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Deskripsi</label>
            <input
              type="text"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Contoh: Ganti oli Honda Vario AB 1234 XY"
              className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
              ID Unit Motor <span className="text-slate-400 font-normal normal-case">(opsional — jika terkait armada tertentu)</span>
            </label>
            <input
              type="number"
              name="motor_unit_id"
              value={formData.motor_unit_id}
              onChange={handleChange}
              placeholder="Kosongkan jika tidak terkait unit tertentu"
              className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Upload struk — hanya tampil saat tambah baru */}
          {!initialData && (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                Struk / Kwitansi <span className="text-slate-400 font-normal normal-case">(opsional — JPG, PNG, PDF)</span>
              </label>
              <label className="cursor-pointer group flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl hover:border-blue-400 hover:bg-blue-50/30 transition-colors">
                <input
                  id="receipt-file"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center group-hover:bg-blue-100 transition-colors shrink-0">
                  <Upload size={16} className="text-slate-400 group-hover:text-blue-500" />
                </div>
                <span className="text-sm text-slate-500 truncate">
                  {fileName || 'Klik untuk lampirkan struk...'}
                </span>
              </label>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-bold text-slate-500 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-md transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Menyimpan...</> : 'Simpan Data'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default ExpenseModal;
