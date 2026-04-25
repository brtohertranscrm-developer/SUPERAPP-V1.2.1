import React, { useEffect, useMemo, useState } from 'react';
import { X, Save, Percent, Hash } from 'lucide-react';

const clampInt = (v, def = 0) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : def;
};

const joinTypes = (types) =>
  Array.isArray(types) ? types.filter(Boolean).join(',') : String(types || '');

const splitTypes = (csv) =>
  String(csv || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

export default function MilesRewardModal({ initialData, onClose, onSubmit }) {
  const isEdit = Boolean(initialData?.id);

  const [title, setTitle] = useState(initialData?.title || '');
  const [rewardType, setRewardType] = useState((initialData?.reward_type || 'percent').toLowerCase());
  const [milesCost, setMilesCost] = useState(clampInt(initialData?.miles_cost, 300));

  const [discountPercent, setDiscountPercent] = useState(clampInt(initialData?.discount_percent, 10));
  const [maxDiscount, setMaxDiscount] = useState(clampInt(initialData?.max_discount, 25000));
  const [discountAmount, setDiscountAmount] = useState(clampInt(initialData?.discount_amount, 25000));

  const [minOrderAmount, setMinOrderAmount] = useState(clampInt(initialData?.min_order_amount, 0));
  const [validDays, setValidDays] = useState(clampInt(initialData?.valid_days, 30));
  const [desc, setDesc] = useState(initialData?.desc || '');
  const [isActive, setIsActive] = useState(Number(initialData?.is_active ?? 1) === 1);

  const [allowedTypes, setAllowedTypes] = useState(() => {
    const t = splitTypes(initialData?.allowed_item_types);
    return {
      motor: t.length ? t.includes('motor') : true,
      car: t.length ? t.includes('car') : true,
      locker: t.length ? t.includes('locker') : true,
    };
  });

  const [ruleJson, setRuleJson] = useState(initialData?.rule_json || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const onEsc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [onClose]);

  const allowedItemTypesCsv = useMemo(() => {
    const items = [];
    if (allowedTypes.motor) items.push('motor');
    if (allowedTypes.car) items.push('car');
    if (allowedTypes.locker) items.push('locker');
    return joinTypes(items);
  }, [allowedTypes]);

  const validate = () => {
    if (!String(title).trim()) return 'Judul reward wajib diisi.';
    if (milesCost <= 0) return 'Miles cost harus > 0.';
    if (validDays < 1 || validDays > 365) return 'Valid days harus 1-365.';
    if (rewardType === 'fixed') {
      if (discountAmount <= 0) return 'Discount amount harus > 0 untuk type fixed.';
    } else {
      if (discountPercent < 1 || discountPercent > 100) return 'Discount percent harus 1-100.';
      if (maxDiscount < 0) return 'Max discount tidak valid.';
    }
    if (minOrderAmount < 0) return 'Minimum order tidak valid.';
    if (ruleJson && String(ruleJson).trim()) {
      try { JSON.parse(String(ruleJson)); } catch { return 'Rule JSON tidak valid.'; }
    }
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) return alert(err);
    setIsSaving(true);
    const payload = {
      title: String(title).trim(),
      reward_type: rewardType,
      miles_cost: milesCost,
      discount_percent: rewardType === 'fixed' ? 0 : discountPercent,
      max_discount: rewardType === 'fixed' ? 0 : maxDiscount,
      discount_amount: rewardType === 'fixed' ? discountAmount : 0,
      min_order_amount: minOrderAmount,
      allowed_item_types: allowedItemTypesCsv,
      valid_days: validDays,
      desc: desc ? String(desc).trim() : null,
      rule_json: ruleJson ? String(ruleJson).trim() : null,
      is_active: isActive ? 1 : 0,
    };
    const ok = await onSubmit(payload, isEdit ? initialData.id : null);
    setIsSaving(false);
    if (ok) onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/40">
      <div className="w-full max-w-2xl bg-white rounded-[2rem] border border-slate-100 shadow-2xl overflow-hidden">
        <div className="p-6 sm:p-7 border-b border-slate-100 flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Miles Rewards</p>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {isEdit ? 'Edit Reward' : 'Tambah Reward'}
            </h2>
            <p className="text-sm text-slate-500 font-medium mt-1">
              Atur jenis reward dan rulenya. Voucher yang dihasilkan terikat akun penukar.
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-50 text-slate-500">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 sm:p-7 space-y-5">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Judul</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="Contoh: Voucher Diskon 15% (Max Rp 50.000)"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Miles Cost</label>
              <input
                type="number"
                value={milesCost}
                onChange={(e) => setMilesCost(clampInt(e.target.value, 0))}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                min={1}
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Jenis</label>
              <select
                value={rewardType}
                onChange={(e) => setRewardType(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="percent">Percent (%)</option>
                <option value="fixed">Fixed (Rp)</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Aktif</label>
              <button
                type="button"
                onClick={() => setIsActive((v) => !v)}
                className={`w-full px-4 py-3 rounded-2xl text-sm font-black border transition-colors ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {isActive ? 'Aktif' : 'Nonaktif'}
              </button>
            </div>
          </div>

          {rewardType === 'fixed' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Diskon Tetap (Rp)</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><Hash size={16} /></div>
                  <input
                    type="number"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(clampInt(e.target.value, 0))}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                    min={1}
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Minimum Order (Rp)</label>
                <input
                  type="number"
                  value={minOrderAmount}
                  onChange={(e) => setMinOrderAmount(clampInt(e.target.value, 0))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                  min={0}
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Diskon (%)</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><Percent size={16} /></div>
                  <input
                    type="number"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(clampInt(e.target.value, 0))}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                    min={1}
                    max={100}
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Max Diskon (Rp)</label>
                <input
                  type="number"
                  value={maxDiscount}
                  onChange={(e) => setMaxDiscount(clampInt(e.target.value, 0))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                  min={0}
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Minimum Order (Rp)</label>
                <input
                  type="number"
                  value={minOrderAmount}
                  onChange={(e) => setMinOrderAmount(clampInt(e.target.value, 0))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                  min={0}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Masa Berlaku (hari)</label>
              <input
                type="number"
                value={validDays}
                onChange={(e) => setValidDays(clampInt(e.target.value, 30))}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                min={1}
                max={365}
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Berlaku Untuk</label>
              <div className="flex flex-wrap gap-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                {[
                  { key: 'motor', label: 'Motor' },
                  { key: 'car', label: 'Mobil' },
                  { key: 'locker', label: 'Loker' },
                ].map((x) => (
                  <label key={x.key} className="inline-flex items-center gap-2 text-xs font-black text-slate-700 px-3 py-2 rounded-xl bg-white border border-slate-200">
                    <input
                      type="checkbox"
                      checked={!!allowedTypes[x.key]}
                      onChange={(e) => setAllowedTypes((p) => ({ ...p, [x.key]: e.target.checked }))}
                    />
                    {x.label}
                  </label>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-1 ml-1">Kosongkan semua = dianggap berlaku untuk semua.</p>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Deskripsi (opsional)</label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none min-h-[90px]"
              placeholder="Ringkas syarat: tidak bisa digabung promo lain, berlaku 1x, dsb."
              maxLength={500}
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Rule JSON (advanced, opsional)</label>
            <textarea
              value={ruleJson}
              onChange={(e) => setRuleJson(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[12px] font-mono text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none min-h-[90px]"
              placeholder='Contoh: {"note":"future_rules"}'
            />
          </div>
        </div>

        <div className="p-6 sm:p-7 border-t border-slate-100 flex flex-col sm:flex-row gap-3 sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-3 rounded-2xl bg-white border border-slate-200 text-slate-700 font-black hover:bg-slate-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-3 rounded-2xl bg-slate-900 text-white font-black hover:bg-emerald-500 transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Save size={18} /> {isSaving ? 'Menyimpan...' : 'Simpan Reward'}
          </button>
        </div>
      </div>
    </div>
  );
}

