import React, { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../utils/api';

const CITY_CONTACTS = {
  jogja: {
    label: 'Jogja',
    phone: '082137928331',
    wa: '6282137928331',
    address: 'Jl. Lempuyangan No.1A, Bausasran, Kec. Danurejan, Kota Yogyakarta, DI Yogyakarta 55211',
  },
  solo: {
    label: 'Solo',
    phone: '082313307400',
    wa: '6282313307400',
    address: 'Jl. Mayang No.14 A, Kestalan, Kec. Banjarsari, Kota Surakarta, Jawa Tengah 57133',
  },
};

const buildWaLink = ({ wa, text }) => {
  const msg = encodeURIComponent(text || '');
  return `https://wa.me/${wa}${msg ? `?text=${msg}` : ''}`;
};

const SocialEmbed = ({ embed }) => {
  const src = embed?.url ? String(embed.url) : '';
  if (!src) return null;

  const provider = String(embed.provider || '').toLowerCase();
  const title =
    provider === 'youtube' ? 'YouTube' :
      provider === 'instagram' ? 'Instagram' :
        provider === 'tiktok' ? 'TikTok' :
          provider === 'maps' ? 'Google Maps' : 'Embed';

  const isMaps = provider === 'maps';
  const allow =
    provider === 'youtube'
      ? 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
      : undefined;

  return (
    <div className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-50">
      <div className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 bg-white border-b border-slate-200">
        {title}
      </div>
      <div className={`w-full ${isMaps ? 'aspect-[16/10]' : 'aspect-video'} bg-slate-100`}>
        <iframe
          title={title}
          src={src}
          className="w-full h-full"
          loading="lazy"
          allow={allow}
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      </div>
    </div>
  );
};

const SeoCta = ({ page }) => {
  const cityKey = String(page?.city || '').toLowerCase();
  const contact = CITY_CONTACTS[cityKey] || null;
  const service = String(page?.service || '').toLowerCase();

  const actions = [
    { label: 'Mulai Booking', href: '/search-page', kind: 'primary' },
  ];

  if (contact?.wa) {
    const waText = `Halo Brothers Trans ${contact.label}, saya mau tanya/booking ${service || 'layanan'}.`;
    actions.push({ label: 'WhatsApp', href: buildWaLink({ wa: contact.wa, text: waText }), kind: 'wa' });
  }

  return (
    <div className="mt-10 rounded-3xl border border-slate-200 bg-slate-900 text-white p-5 md:p-6 shadow-xl">
      <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/60">Booking</div>
      <div className="mt-2 text-lg md:text-xl font-black">Siap booking sekarang?</div>
      <div className="mt-2 text-sm text-white/70 font-medium leading-relaxed">
        Pilih layanan dan lanjutkan booking via website. Kalau butuh bantuan cepat, chat WhatsApp cabang {contact?.label || 'terdekat'}.
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {actions.map((a) => (
          <a
            key={a.label}
            href={a.href}
            target={a.kind === 'wa' ? '_blank' : undefined}
            rel={a.kind === 'wa' ? 'noopener noreferrer' : undefined}
            className={
              a.kind === 'primary'
                ? 'px-4 py-2.5 rounded-2xl bg-white text-slate-900 font-black text-sm hover:bg-slate-100'
                : a.kind === 'wa'
                  ? 'px-4 py-2.5 rounded-2xl bg-emerald-500 text-white font-black text-sm hover:bg-emerald-600'
                  : 'px-4 py-2.5 rounded-2xl bg-white/10 text-white font-black text-sm hover:bg-white/15 border border-white/10'
            }
          >
            {a.label}
          </a>
        ))}
      </div>
    </div>
  );
};

const ensureMetaTag = (name) => {
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  return el;
};

export default function SeoPage({ slug }) {
  const normalizedSlug = useMemo(() => String(slug || '').replace(/^\/+/, '').replace(/\/+$/, ''), [slug]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    setError('');

    apiFetch(`/api/pages/${normalizedSlug}`)
      .then((res) => {
        if (!mounted) return;
        setPage(res?.data || null);
      })
      .catch((err) => {
        if (!mounted) return;
        setPage(null);
        setError(err?.message || 'Halaman tidak ditemukan.');
      })
      .finally(() => {
        if (!mounted) return;
        setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [normalizedSlug]);

  useEffect(() => {
    if (!page) return;
    if (page.title) document.title = page.title;
    if (page.meta_description) {
      const meta = ensureMetaTag('description');
      meta.setAttribute('content', page.meta_description);
    }
  }, [page]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 pt-24">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
            <div className="h-6 w-2/3 bg-slate-100 rounded mb-4" />
            <div className="space-y-2">
              <div className="h-4 w-full bg-slate-100 rounded" />
              <div className="h-4 w-5/6 bg-slate-100 rounded" />
              <div className="h-4 w-4/6 bg-slate-100 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="min-h-screen bg-slate-50 pt-24">
        <div className="max-w-3xl mx-auto px-4">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
            <h1 className="text-xl font-black text-slate-900">Halaman tidak tersedia</h1>
            <p className="text-sm text-slate-500 font-medium mt-2">{error || 'Halaman tidak ditemukan.'}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <a href="/" className="px-4 py-2 rounded-xl bg-blue-600 text-white font-black text-sm hover:bg-blue-700">
                Ke Beranda
              </a>
              <a href="/motor" className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-black text-sm hover:bg-slate-200">
                Lihat Motor
              </a>
              <a href="/mobil" className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-black text-sm hover:bg-slate-200">
                Lihat Mobil
              </a>
              <a href="/loker" className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-black text-sm hover:bg-slate-200">
                Lihat Loker
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const sections = Array.isArray(page.sections) ? page.sections : [];
  const faqs = Array.isArray(page.faqs) ? page.faqs : [];

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 md:p-10">
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
            Brothers Trans
          </div>
          <h1 className="mt-2 text-2xl md:text-3xl font-black tracking-tight text-slate-900">
            {page.h1 || 'Informasi'}
          </h1>
          {page.meta_description && (
            <p className="mt-3 text-sm md:text-base text-slate-600 font-medium leading-relaxed">
              {page.meta_description}
            </p>
          )}

          <div className="mt-8 space-y-8">
            {sections.map((s) => (
              <section key={s.key || s.title} className="space-y-3">
                {s.title ? (
                  <h2 className="text-lg md:text-xl font-black text-slate-900">{s.title}</h2>
                ) : null}
                {s.embed ? <SocialEmbed embed={s.embed} /> : null}
                <div
                  className="prose prose-slate max-w-none prose-a:text-blue-600 prose-a:font-bold prose-strong:text-slate-900"
                  dangerouslySetInnerHTML={{ __html: String(s.body_html || '') }}
                />
              </section>
            ))}

            {faqs.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-lg md:text-xl font-black text-slate-900">FAQ</h2>
                <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 overflow-hidden">
                  {faqs.map((f, idx) => (
                    <details key={`${idx}-${f.q}`} className="group bg-white p-4">
                      <summary className="cursor-pointer list-none font-black text-slate-900 flex items-start justify-between gap-4">
                        <span>{f.q}</span>
                        <span className="text-slate-400 group-open:rotate-45 transition-transform">+</span>
                      </summary>
                      <div className="mt-2 text-sm text-slate-600 font-medium leading-relaxed">
                        {f.a}
                      </div>
                    </details>
                  ))}
                </div>
              </section>
            )}

            <SeoCta page={page} />
          </div>
        </div>
      </div>
    </div>
  );
}
