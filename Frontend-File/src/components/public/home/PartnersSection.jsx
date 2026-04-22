import React, { useMemo, useState } from 'react';
import { BadgePercent, ChevronRight, MapPinned, Store } from 'lucide-react';

const PartnersSection = ({ partners = [] }) => {
  const [expanded, setExpanded] = useState(false);

  const items = Array.isArray(partners) ? partners : [];
  const visibleDesktop = useMemo(() => (expanded ? items : items.slice(0, 4)), [expanded, items]);

  if (items.length === 0) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 pb-24 relative z-10">
      <div className="bg-white rounded-[3rem] p-6 sm:p-8 border border-slate-100 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Store size={18} className="text-indigo-600" /> Partner Brother Trans
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-1 max-w-xl">
              Promo kecil dari partner pilihan (bengkel, toko, tempat wisata). Bonus—tanpa mengganggu proses booking.
            </p>
          </div>

          {items.length > 4 && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-[11px] font-black text-indigo-600 hover:text-slate-900 transition-colors inline-flex items-center gap-2"
            >
              {expanded ? 'Tutup' : 'Lihat lainnya'} <ChevronRight size={16} className={expanded ? '-rotate-90 transition-transform' : 'transition-transform'} />
            </button>
          )}
        </div>

        {/* Mobile: horizontal scroll | Desktop: compact grid */}
        <div className="sm:hidden flex gap-4 overflow-x-auto pb-2 -mx-2 px-2">
          {items.slice(0, 8).map((p) => (
            <PartnerCard key={p.id} partner={p} compact />
          ))}
        </div>

        <div className="hidden sm:grid grid-cols-2 lg:grid-cols-4 gap-4">
          {visibleDesktop.map((p) => (
            <PartnerCard key={p.id} partner={p} />
          ))}
        </div>
      </div>
    </div>
  );
};

const PartnerCard = ({ partner, compact = false }) => {
  const name = partner?.name || 'Partner';
  const category = partner?.category || 'Partner';
  const city = partner?.city || '';
  const headline = partner?.headline || partner?.promo_text || '';
  const ctaLabel = partner?.cta_label || 'Lihat Promo';
  const ctaUrl = partner?.cta_url || '';
  const mapsUrl = partner?.maps_url || '';

  const handleOpen = (url) => {
    if (!url) return;
    window.open(url, '_blank', 'noreferrer');
  };

  return (
    <div className={`bg-slate-50 border border-slate-100 rounded-3xl overflow-hidden hover:shadow-lg transition-shadow ${compact ? 'min-w-[260px]' : ''}`}>
      <div className={`${compact ? 'h-24' : 'h-28'} bg-slate-100 overflow-hidden relative`}>
        {partner?.image_url ? (
          <img src={partner.image_url} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300">
            <Store size={24} />
          </div>
        )}
        <div className="absolute top-3 left-3 flex flex-wrap gap-2">
          <span className="px-2.5 py-1 rounded-xl bg-white/90 text-slate-800 text-[9px] font-black uppercase tracking-widest border border-white/50">
            {category}
          </span>
          {city ? (
            <span className="px-2.5 py-1 rounded-xl bg-slate-900/80 text-white text-[9px] font-black uppercase tracking-widest border border-white/10">
              {city}
            </span>
          ) : null}
        </div>
      </div>

      <div className={`${compact ? 'p-4' : 'p-5'}`}>
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-black text-slate-900 text-sm leading-tight line-clamp-2">{name}</h3>
          <div className="shrink-0 w-9 h-9 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-indigo-600">
            <BadgePercent size={18} />
          </div>
        </div>
        {headline ? (
          <p className="text-[11px] text-slate-600 font-semibold mt-2 line-clamp-2">{headline}</p>
        ) : (
          <p className="text-[11px] text-slate-400 font-semibold mt-2">Promo partner tersedia.</p>
        )}

        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => handleOpen(ctaUrl || mapsUrl)}
            disabled={!ctaUrl && !mapsUrl}
            className="flex-1 py-2.5 rounded-2xl bg-white border border-slate-200 text-slate-900 font-black text-[11px] hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {ctaUrl ? ctaLabel : (mapsUrl ? 'Buka Lokasi' : '—')}
          </button>
          {mapsUrl ? (
            <button
              type="button"
              onClick={() => handleOpen(mapsUrl)}
              className="w-11 h-11 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-50"
              title="Maps"
            >
              <MapPinned size={18} />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default PartnersSection;

