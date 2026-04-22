import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, X, MapPin, Headset, Search, Calendar, CreditCard, ChevronRight, Bike } from 'lucide-react';
import { WA_CONTACTS, buildWaLink } from '../../config/contacts';

export default function FloatingHelpWhatsApp({ cityHint }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const tutorialSteps = [
    {
      key: 'search',
      icon: <Search size={16} className="text-rose-500" />,
      title: 'Pilih motor & lokasi',
      desc: 'Buka katalog, lalu pilih kota dan jenis motor yang kamu mau.',
    },
    {
      key: 'schedule',
      icon: <Calendar size={16} className="text-amber-500" />,
      title: 'Isi tanggal dan jam sewa',
      desc: 'Tentukan waktu ambil dan waktu kembali agar stok tampil akurat.',
    },
    {
      key: 'pay',
      icon: <CreditCard size={16} className="text-emerald-500" />,
      title: 'Checkout lalu bayar',
      desc: 'Lengkapi data, pilih add-on, lalu lanjut pembayaran sesuai petunjuk.',
    },
  ];

  const items = useMemo(() => {
    const base = [
      {
        key: 'jogja',
        title: WA_CONTACTS.JOGJA_ADMIN.label,
        subtitle: 'Bantuan booking area Jogja',
        href: buildWaLink(
          WA_CONTACTS.JOGJA_ADMIN.phone_wa,
          'Halo Admin Brother Trans Jogja, saya sudah mencoba booking di website tetapi masih butuh bantuan.'
        ),
      },
      {
        key: 'solo',
        title: WA_CONTACTS.SOLO_ADMIN.label,
        subtitle: 'Bantuan booking area Solo',
        href: buildWaLink(
          WA_CONTACTS.SOLO_ADMIN.phone_wa,
          'Halo Admin Brother Trans Solo, saya sudah mencoba booking di website tetapi masih butuh bantuan.'
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
        <div className="absolute bottom-full right-0 mb-3 w-[360px] max-w-[90vw] bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-fade-in-up">
          <div className="bg-slate-900 text-white px-5 py-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                <Bike size={12} /> Panduan Booking
              </p>
              <p className="font-black text-base leading-tight">
                Booking sendiri lebih cepat
              </p>
              <p className="text-xs text-slate-400 font-medium mt-1">
                Ikuti langkah singkat ini dulu. Kalau masih bingung, baru chat admin.
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

          <div className="p-4">
            <div className="space-y-3">
              {tutorialSteps.map((step, index) => (
                <div key={step.key} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-sm">
                    {step.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-black text-slate-900 text-sm">
                      {index + 1}. {step.title}
                    </p>
                    <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                setOpen(false);
                navigate('/motor');
              }}
              className="w-full mt-4 bg-slate-900 text-white rounded-2xl px-4 py-3 font-black text-sm hover:bg-rose-500 transition-colors flex items-center justify-center gap-2"
            >
              Mulai Booking Sekarang <ChevronRight size={16} />
            </button>

            <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
              <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-2 flex items-center gap-2">
                <Headset size={12} /> Jika Masih Perlu Bantuan
              </p>
              <div className="space-y-2">
                {items.map((it) => (
                  <a
                    key={it.key}
                    href={it.href}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-emerald-100 bg-white hover:bg-emerald-50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-black text-slate-900 text-sm truncate flex items-center gap-2">
                        <MapPin size={14} className="text-emerald-600" />
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
              </div>

              <p className="text-[11px] text-slate-500 font-medium mt-3 leading-relaxed">
                Kalau sudah sampai checkout atau sudah punya kode booking, kirim detail itu ke admin agar dibantu lebih cepat.
              </p>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-14 h-14 rounded-2xl shadow-2xl bg-[#25D366] hover:bg-[#20bd5a] text-white flex items-center justify-center transition-colors active:scale-95"
        aria-label="Panduan Booking"
      >
        <MessageCircle size={24} />
      </button>
    </div>
  );
}
