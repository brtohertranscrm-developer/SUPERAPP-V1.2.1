import React, { useState } from 'react';
import { X, Upload, Loader2 } from 'lucide-react';

const ReconciliationModal = ({ onClose, onSubmit }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fileName, setFileName] = useState('');
  const [formData, setFormData] = useState({
    order_id: '',
    bank_name: 'bca',
    transfer_amount: '',
    transfer_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

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

    const fd = new FormData();
    Object.entries(formData).forEach(([k, v]) => fd.append(k, v));
    const fileInput = document.getElementById('proof-file');
    if (fileInput?.files[0]) fd.append('proof', fileInput.files[0]);

    const success = await onSubmit(fd);
    if (success) onClose();
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">

        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-xl font-black text-slate-800">Upload Bukti Transfer</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-rose-500 rounded-xl hover:bg-rose-50 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 bg-slate-50">

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Order ID Booking</label>
            <input
              type="text"
              name="order_id"
              value={formData.order_id}
              onChange={handleChange}
              required
              placeholder="Contoh: BTM-202401-1234"
              className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Bank Pengirim</label>
              <select
                name="bank_name"
                value={formData.bank_name}
                onChange={handleChange}
                className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
              >
                <option value="bca">BCA</option>
                <option value="mandiri">Mandiri</option>
                <option value="qris">QRIS / E-Wallet</option>
                <option value="cash">Cash</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Tanggal Transfer</label>
              <input
                type="date"
                name="transfer_date"
                value={formData.transfer_date}
                onChange={handleChange}
                required
                className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Nominal Transfer (Rp)</label>
            <input
              type="number"
              name="transfer_amount"
              value={formData.transfer_amount}
              onChange={handleChange}
              required
              min="1"
              placeholder="150000"
              className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Upload Bukti Transfer */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
              Bukti Transfer <span className="text-slate-400 font-normal normal-case">(JPG, PNG, PDF — maks 5MB)</span>
            </label>
            <label className="cursor-pointer group flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl hover:border-blue-400 hover:bg-blue-50/30 transition-colors">
              <input
                id="proof-file"
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center group-hover:bg-blue-100 transition-colors shrink-0">
                <Upload size={16} className="text-slate-400 group-hover:text-blue-500" />
              </div>
              <span className="text-sm text-slate-500 truncate">
                {fileName || 'Klik untuk pilih file...'}
              </span>
            </label>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
              Catatan <span className="text-slate-400 font-normal normal-case">(opsional)</span>
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="2"
              placeholder="Contoh: Transfer dari rekening atas nama Budi..."
              className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

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
              {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Mengunggah...</> : 'Simpan Bukti'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default ReconciliationModal;
