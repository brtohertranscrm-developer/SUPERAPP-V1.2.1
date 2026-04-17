import React from 'react';
import { Package, Lock, Check } from 'lucide-react';

const fmtRp = (n) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;

const TYPE_CONFIG = {
  terbuka: {
    label: 'Rak Terbuka',
    Icon: Package,
    color: 'emerald',
    desc: 'Akses mudah, cocok untuk koper atau barang besar',
    perks: ['Akses cepat tanpa kunci', 'Cocok koper & ransel besar']
  },
  tertutup: {
    label: 'Rak Tertutup',
    Icon: Lock,
    color: 'blue',
    desc: 'Terkunci dengan sistem keamanan, untuk barang berharga',
    perks: ['Kunci personal', 'Lebih aman untuk barang berharga']
  }
};

const COLOR = {
  emerald: {
    badge:    'bg-emerald-50 text-emerald-700 border-emerald-200',
    selected: 'border-emerald-500 bg-emerald-50/50',
    iconBg:   'bg-emerald-100',
    iconText: 'text-emerald-600',
    btn:      'bg-emerald-500 hover:bg-emerald-600',
    priceBg:  'bg-emerald-50 border-emerald-100',
    priceText:'text-emerald-700'
  },
  blue: {
    badge:    'bg-blue-50 text-blue-700 border-blue-200',
    selected: 'border-blue-500 bg-blue-50/50',
    iconBg:   'bg-blue-100',
    iconText: 'text-blue-600',
    btn:      'bg-blue-500 hover:bg-blue-600',
    priceBg:  'bg-blue-50 border-blue-100',
    priceText:'text-blue-700'
  }
};

const LockerCard = ({ locker, isSelected, onSelect }) => {
  const type = locker.type || 'terbuka';
  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.terbuka;
  const c = COLOR[cfg.color];
  const { Icon } = cfg;

  return (
    <div
      onClick={() => onSelect(locker)}
      className={`relative bg-white rounded-2xl border-2 cursor-pointer transition-all hover:shadow-lg active:scale-[0.98] overflow-hidden ${
        isSelected ? `${c.selected} shadow-md` : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      {/* Centang terpilih */}
      {isSelected && (
        <div className={`absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center bg-current ${c.btn.split(' ')[0]}`}>
          <Check size={13} className="text-white" strokeWidth={3} />
        </div>
      )}

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${c.iconBg}`}>
            <Icon size={22} className={c.iconText} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${c.badge}`}>
                {cfg.label}
              </span>
            </div>
            <p className="text-xs text-slate-500">{locker.location}</p>
            {locker.dimensions && (
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">{locker.dimensions} cm</p>
            )}
          </div>
        </div>

        {/* Kelebihan */}
        <ul className="space-y-1 mb-4">
          {cfg.perks.map((p) => (
            <li key={p} className="flex items-center gap-2 text-xs text-slate-600">
              <span className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${c.iconBg}`}>
                <Check size={10} className={c.iconText} strokeWidth={3} />
              </span>
              {p}
            </li>
          ))}
        </ul>

        {/* Harga Tier */}
        <div className={`rounded-xl border p-3 ${c.priceBg}`}>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Harga Sewa</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: '1 jam', value: locker.price_1h },
              { label: '12 jam', value: locker.price_12h },
              { label: '24 jam', value: locker.price_24h }
            ].map((tier) => (
              <div key={tier.label} className="text-center">
                <p className={`text-sm font-black ${c.priceText}`}>{fmtRp(tier.value)}</p>
                <p className="text-[10px] text-slate-400">{tier.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Stok */}
        <div className="flex items-center justify-between mt-3">
          <span className="text-[11px] text-slate-400">
            Tersedia <span className="font-bold text-slate-600">{locker.stock}</span> unit
          </span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Min. 3 jam</span>
        </div>
      </div>
    </div>
  );
};

export default LockerCard;
