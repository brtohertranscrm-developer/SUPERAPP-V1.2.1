import React, { useMemo } from 'react';

const CITY_CONTACTS = {
  jogja: {
    label: 'Jogja',
    wa: '6282137928331',
  },
  solo: {
    label: 'Solo',
    wa: '6282313307400',
  },
};

const buildWaLink = ({ wa, text }) => {
  const msg = encodeURIComponent(text || '');
  return `https://wa.me/${wa}${msg ? `?text=${msg}` : ''}`;
};

const normalizeCityKey = (value) => {
  const v = String(value || '').toLowerCase();
  if (v.includes('solo')) return 'solo';
  if (v.includes('yogya') || v.includes('jogja')) return 'jogja';
  if (v === 'jogja' || v === 'solo') return v;
  return null;
};

export default function TwoButtonCta({
  city,
  serviceLabel = 'layanan',
  title = 'Siap booking sekarang?',
  description = 'Mulai booking lewat website. Kalau butuh bantuan cepat, chat WhatsApp cabang terdekat.',
  primaryLabel = 'Mulai Booking',
  primaryHref,
  onPrimaryClick,
}) {
  const cityKey = useMemo(() => normalizeCityKey(city) || 'jogja', [city]);
  const contact = CITY_CONTACTS[cityKey];
  const waHref = useMemo(() => {
    const text = `Halo Brothers Trans ${contact.label}, saya mau tanya/booking ${serviceLabel}.`;
    return buildWaLink({ wa: contact.wa, text });
  }, [contact.label, contact.wa, serviceLabel]);

  const primaryProps = primaryHref
    ? { href: primaryHref }
    : { href: '#', onClick: (e) => { e.preventDefault(); onPrimaryClick?.(); } };

  return (
    <div className="rounded-[32px] border border-slate-200 bg-slate-900 text-white p-5 md:p-6 shadow-xl">
      <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/60">Booking</div>
      <div className="mt-2 text-lg md:text-xl font-black">{title}</div>
      <div className="mt-2 text-sm text-white/70 font-medium leading-relaxed">{description}</div>
      <div className="mt-5 flex flex-wrap gap-2">
        <a
          {...primaryProps}
          className="px-4 py-2.5 rounded-2xl bg-white text-slate-900 font-black text-sm hover:bg-slate-100"
        >
          {primaryLabel}
        </a>
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2.5 rounded-2xl bg-emerald-500 text-white font-black text-sm hover:bg-emerald-600"
        >
          WhatsApp
        </a>
      </div>
    </div>
  );
}

