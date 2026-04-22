import React, { useMemo, useState } from 'react';
import { MessageCircle, X, MapPin, Headset } from 'lucide-react';
import { WA_CONTACTS, buildWaLink } from '../../config/contacts';

export default function FloatingHelpWhatsApp({ cityHint }) {
  const [open, setOpen] = useState(false);

  const items = useMemo(() => {
    const base = [
      {
        key: 'jogja',
        title: WA_CONTACTS.JOGJA_ADMIN.label,
        subtitle: 'Booking Jogja, bantuan cepat',
        href: buildWaLink(
          WA_CONTACTS.JOGJA_ADMIN.phone_wa,
          'Halo Admin Brother Trans Jogja, saya butuh bantuan terkait booking/rental motor.'
        ),
      },
      {
        key: 'solo',
        title: WA_CONTACTS.SOLO_ADMIN.label,
        subtitle: 'Booking Solo, bantuan cepat',
        href: buildWaLink(
          WA_CONTACTS.SOLO_ADMIN.phone_wa,
          'Halo Admin Brother Trans Solo, saya butuh bantuan terkait booking/rental motor.'
        ),
      },
    ];

    // Put hinted city first (nice-to-have)
    if (!cityHint) return base;
    const hint = String(cityHint).toLowerCase();
    if (hint.includes('solo')) return [base[1], base[0]];
    if (hint.includes('jog') || hint.includes('yog')) return [base[0], base[1]];
    return base;
  }, [cityHint]);

  return (
    <div className="fixed z-[90] right-4 bottom-4 sm:right-6 sm:bottom-6">
      {open && (
        <div className="mb-3 w-[320px] max-w-[85vw] bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-fade-in-up">
          <div className="bg-slate-900 text-white px-5 py-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                <Headset size={12} /> Pusat Bantuan WhatsApp
              </p>
              <p className="font-black text-base leading-tight truncate">
                Hubungi Admin
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors shrink-0"
              aria-label="Tutup"
            >
              <X size={16} />
            </button>
          </div>

          <div className="p-4 space-y-2">
            {items.map((it) => (
              <a
                key={it.key}
                href={it.href}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-3 p-4 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-white transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-black text-slate-900 text-sm truncate flex items-center gap-2">
                    <MapPin size={14} className="text-rose-500" />
                    {it.title}
                  </p>
                  <p className="text-xs text-slate-500 font-medium truncate mt-1">
                    {it.subtitle}
                  </p>
                </div>
                <div className="shrink-0 px-3 py-2 rounded-xl bg-[#25D366] text-white font-black text-xs">
                  Chat
                </div>
              </a>
            ))}

            <p className="text-[11px] text-slate-400 font-medium px-1 pt-1">
              Tips: kirim `order_id` kalau sudah ada, biar admin cepat cek.
            </p>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-14 h-14 rounded-2xl shadow-2xl bg-[#25D366] hover:bg-[#20bd5a] text-white flex items-center justify-center transition-colors active:scale-95"
        aria-label="Bantuan WhatsApp"
      >
        <MessageCircle size={24} />
      </button>
    </div>
  );
}

