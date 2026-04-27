import React from 'react';
import { Clock, MapPin, ShieldCheck } from 'lucide-react';

export default function TrustBadges({
  items = [
    { icon: Clock, title: 'Operasional 24 Jam', desc: 'Chat & booking siap kapan saja.' },
    { icon: MapPin, title: 'Jogja & Solo', desc: 'Cabang dekat area strategis.' },
    { icon: ShieldCheck, title: 'Transaksi Aman', desc: 'Konfirmasi & proses jelas.' },
  ],
}) {
  const list = Array.isArray(items) ? items : [];
  if (list.length === 0) return null;

  return (
    <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {list.map((it) => {
        const Icon = it.icon;
        return (
          <div key={it.title} className="bg-white rounded-3xl shadow-sm border border-slate-200 p-5">
            <div className="w-11 h-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
              <Icon size={18} />
            </div>
            <div className="mt-3 text-sm font-black text-slate-900">{it.title}</div>
            <div className="mt-1 text-xs text-slate-500 font-medium leading-relaxed">{it.desc}</div>
          </div>
        );
      })}
    </section>
  );
}

