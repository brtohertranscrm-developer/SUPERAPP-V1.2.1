import React from 'react';
import { CreditCard } from 'lucide-react';

// PaymentMethodPicker — nomor rekening diambil dari props (berasal dari API)
// Tidak ada nomor rekening hardcoded di sini
export default function PaymentMethodPicker({ value, onChange, paymentInfo }) {
  const methods = [
    {
      id: 'bca',
      label: 'Bank BCA',
      detail: paymentInfo?.bca?.number
        ? `No. Rek: ${paymentInfo.bca.number} (a/n ${paymentInfo.bca.name})`
        : 'Memuat info rekening...',
      icon: <CreditCard size={20} className="text-blue-700" />,
      badge: 'BCA',
      badgeCls: 'bg-blue-50 text-blue-800 border-blue-200',
    },
    {
      id: 'mandiri',
      label: 'Bank Mandiri',
      detail: paymentInfo?.mandiri?.number
        ? `No. Rek: ${paymentInfo.mandiri.number} (a/n ${paymentInfo.mandiri.name})`
        : 'Memuat info rekening...',
      icon: <CreditCard size={20} className="text-amber-600" />,
      badge: 'MANDIRI',
      badgeCls: 'bg-amber-50 text-amber-800 border-amber-200',
    },
  ];

  return (
    <div className="space-y-3">
      {methods.map((m) => (
        <label
          key={m.id}
          className={`flex items-center gap-4 p-4 border-2 rounded-2xl cursor-pointer transition-all select-none ${
            value === m.id
              ? 'border-slate-900 bg-slate-50 shadow-sm'
              : 'border-slate-200 hover:border-slate-300 bg-white'
          }`}
        >
          <input
            type="radio"
            name="paymentMethod"
            value={m.id}
            checked={value === m.id}
            onChange={() => onChange(m.id)}
            className="w-4 h-4 accent-slate-900"
          />
          <div className="flex items-center gap-3 flex-1 overflow-hidden">
            <div className="p-2 bg-white border border-slate-100 rounded-xl shadow-sm shrink-0">
              {m.icon}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-slate-900 text-sm">{m.label}</p>
              <p className="text-xs text-slate-500 font-medium truncate">{m.detail}</p>
            </div>
          </div>
          <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg border shrink-0 ${m.badgeCls}`}>
            {m.badge}
          </span>
        </label>
      ))}
    </div>
  );
}

