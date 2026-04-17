import React, { useState, useEffect } from 'react';
import { Pencil, Check, X, AlertCircle, CheckCircle, Clock } from 'lucide-react';

const fmtRp = (n) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;

// Baris harga yang bisa diedit inline
const PriceLine = ({ label, field, value, onSave, isDeduction = false, isEditable = true }) => {
  const [editing, setEditing] = useState(false);
  const [tempVal, setTempVal] = useState(value);

  useEffect(() => { setTempVal(value); }, [value]);

  const handleSave = () => {
    const parsed = parseInt(tempVal) || 0;
    onSave(field, parsed);
    setEditing(false);
  };

  const handleCancel = () => {
    setTempVal(value);
    setEditing(false);
  };

  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0 gap-3">
      <span className="text-sm text-slate-600 flex-1">{label}</span>
      {editing ? (
        <div className="flex items-center gap-2">
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">Rp</span>
            <input
              type="number"
              value={tempVal}
              onChange={e => setTempVal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancel(); }}
              autoFocus
              className="w-32 pl-8 pr-2 py-1.5 text-xs font-mono bg-white border border-blue-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
          <button onClick={handleSave} className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200 transition-colors">
            <Check size={13} strokeWidth={3} />
          </button>
          <button onClick={handleCancel} className="p-1.5 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200 transition-colors">
            <X size={13} strokeWidth={3} />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold ${
            isDeduction ? 'text-emerald-600' : (value > 0 ? 'text-slate-800' : 'text-slate-400')
          }`}>
            {isDeduction ? '− ' : ''}{fmtRp(value)}
          </span>
          {isEditable && (
            <button
              onClick={() => setEditing(true)}
              className="p-1 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
            >
              <Pencil size={12} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ==========================================
// KOMPONEN UTAMA
// ==========================================
const BookingPricePanel = ({ booking, onSavePricing, isSaving = false }) => {
  const [fields, setFields] = useState({
    base_price:       0,
    discount_amount:  0,
    promo_code:       '',
    service_fee:      0,
    extend_fee:       0,
    addon_fee:        0,
    delivery_fee:     0,
    paid_amount:      0,
    outstanding_amount: 0,
    price_notes:      ''
  });
  const [isDirty, setIsDirty] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [editingPromo, setEditingPromo] = useState(false);

  useEffect(() => {
    // 💡 TAMBAHKAN BARIS INI UNTUK DEBUGGING
    console.log("Data Booking masuk ke Price Panel:", booking); 

    if (booking) {
      setFields({
        base_price:        booking.base_price        || 0,
        discount_amount:   booking.discount_amount   || 0,
        promo_code:        booking.promo_code        || '',
        service_fee:       booking.service_fee       || 0,
        extend_fee:        booking.extend_fee        || 0,
        addon_fee:         booking.addon_fee         || 0,
        delivery_fee:      booking.delivery_fee      || 0,
        paid_amount:       booking.paid_amount       || 0,
        outstanding_amount:booking.outstanding_amount|| 0,
        price_notes:       booking.price_notes       || ''
      });
      setIsDirty(false);
    }
  }, [booking]); // <--- Pastikan baris penutup ini ada dan tidak terhapus

  const handleFieldSave = (field, value) => {
    setFields(prev => {
      const updated = { ...prev, [field]: value };
      // Auto-hitung ulang outstanding jika paid_amount atau komponen berubah
      const total = calcTotal(updated);
      updated.outstanding_amount = Math.max(0, total - updated.paid_amount);
      return updated;
    });
    setIsDirty(true);
  };

  const calcTotal = (f) => {
    return (f.base_price || 0)
      - (f.discount_amount || 0)
      + (f.service_fee || 0)
      + (f.extend_fee || 0)
      + (f.addon_fee || 0)
      + (f.delivery_fee || 0);
  };

  const total = calcTotal(fields);
  const outstanding = Math.max(0, total - fields.paid_amount);
  const isFullyPaid = outstanding === 0 && fields.paid_amount > 0;
  const isPartiallyPaid = fields.paid_amount > 0 && outstanding > 0;
  const isUnpaid = fields.paid_amount === 0;

  const handleSave = () => {
    const payload = { ...fields, outstanding_amount: outstanding };
    onSavePricing(payload);
    setIsDirty(false);
  };

  if (!booking) return null;

  return (
    <div className="space-y-4">

      {/* Status pembayaran ringkas */}
      <div className={`flex items-center gap-3 p-4 rounded-2xl border ${
        isFullyPaid   ? 'bg-emerald-50 border-emerald-200' :
        isPartiallyPaid ? 'bg-amber-50 border-amber-200' :
        'bg-red-50 border-red-200'
      }`}>
        {isFullyPaid
          ? <CheckCircle size={20} className="text-emerald-500 shrink-0" />
          : isPartiallyPaid
          ? <Clock size={20} className="text-amber-500 shrink-0" />
          : <AlertCircle size={20} className="text-red-500 shrink-0" />
        }
        <div>
          <p className={`text-sm font-black ${
            isFullyPaid ? 'text-emerald-700' : isPartiallyPaid ? 'text-amber-700' : 'text-red-700'
          }`}>
            {isFullyPaid ? 'Lunas' : isPartiallyPaid ? 'Bayar Sebagian' : 'Belum Dibayar'}
          </p>
          {!isFullyPaid && outstanding > 0 && (
            <p className="text-xs text-slate-600">
              Outstanding: <span className="font-black">{fmtRp(outstanding)}</span>
            </p>
          )}
        </div>
        {isFullyPaid && (
          <p className="ml-auto text-xs text-emerald-600 font-bold">{fmtRp(fields.paid_amount)} diterima</p>
        )}
      </div>

      {/* Breakdown harga — semua baris editable */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-4 pt-4 pb-2 border-b border-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rincian Harga</p>
        </div>
        <div className="px-4 group">
          <PriceLine label="Harga sewa dasar"    field="base_price"      value={fields.base_price}      onSave={handleFieldSave} />
          <PriceLine label="Biaya layanan"        field="service_fee"     value={fields.service_fee}     onSave={handleFieldSave} />
          <PriceLine label="Perpanjangan sewa"    field="extend_fee"      value={fields.extend_fee}      onSave={handleFieldSave} />
          <PriceLine label="Addon (helm, dll)"    field="addon_fee"       value={fields.addon_fee}       onSave={handleFieldSave} />
          <PriceLine label="Antar/jemput unit"    field="delivery_fee"    value={fields.delivery_fee}    onSave={handleFieldSave} />
          <PriceLine label="Diskon promo"         field="discount_amount" value={fields.discount_amount} onSave={handleFieldSave} isDeduction />
        </div>

        {/* Kode promo */}
        <div className="px-4 py-2.5 flex items-center justify-between border-t border-slate-100">
          <span className="text-xs text-slate-400 font-medium">Kode promo</span>
          {editingPromo ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={fields.promo_code}
                onChange={e => { setFields(p => ({...p, promo_code: e.target.value})); setIsDirty(true); }}
                placeholder="Masukkan kode..."
                className="w-28 px-2 py-1 text-xs font-mono uppercase bg-white border border-blue-400 rounded-lg focus:outline-none"
                autoFocus
              />
              <button onClick={() => setEditingPromo(false)} className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg">
                <Check size={12} strokeWidth={3} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-slate-700">
                {fields.promo_code || <span className="text-slate-300 font-normal">—</span>}
              </span>
              <button onClick={() => setEditingPromo(true)} className="p-1 text-slate-300 hover:text-blue-500 rounded-lg">
                <Pencil size={12} />
              </button>
            </div>
          )}
        </div>

        {/* Subtotal */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
          <span className="text-sm font-black text-slate-700">Total Tagihan</span>
          <span className="text-base font-black text-slate-900">{fmtRp(total)}</span>
        </div>
      </div>

      {/* Pembayaran */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-4 pt-4 pb-2 border-b border-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status Pembayaran</p>
        </div>
        <div className="px-4 group">
          <PriceLine
            label="Sudah diterima / dibayar"
            field="paid_amount"
            value={fields.paid_amount}
            onSave={handleFieldSave}
          />
        </div>
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
          <span className={`text-sm font-black ${outstanding > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {outstanding > 0 ? 'Outstanding' : 'Lunas'}
          </span>
          <span className={`text-base font-black ${outstanding > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {outstanding > 0 ? fmtRp(outstanding) : '✓ ' + fmtRp(fields.paid_amount)}
          </span>
        </div>
      </div>

      {/* Catatan Admin */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Catatan Admin</p>
        {editingNotes ? (
          <div className="space-y-2">
            <textarea
              value={fields.price_notes}
              onChange={e => { setFields(p => ({...p, price_notes: e.target.value})); setIsDirty(true); }}
              rows={3}
              placeholder="Contoh: Pelanggan transfer separuh dulu, sisanya besok..."
              className="w-full p-3 text-sm bg-slate-50 border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button onClick={() => setEditingNotes(false)} className="text-xs font-bold text-blue-600 hover:text-blue-700">
              Selesai
            </button>
          </div>
        ) : (
          <div
            onClick={() => setEditingNotes(true)}
            className="cursor-text min-h-[40px] p-3 text-sm bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500 hover:border-blue-300 hover:bg-blue-50/30 transition-colors"
          >
            {fields.price_notes || <span className="text-slate-300">Klik untuk tambah catatan...</span>}
          </div>
        )}
      </div>

      {/* Tombol simpan — muncul hanya jika ada perubahan */}
      {isDirty && (
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full py-3 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 shadow-md transition-colors disabled:opacity-50 text-sm flex items-center justify-center gap-2"
        >
          {isSaving ? 'Menyimpan...' : 'Simpan Rincian Harga'}
        </button>
      )}

    </div>
  );
};

export default BookingPricePanel;
