import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, MapPin, Navigation, Zap } from 'lucide-react';
import { apiFetch } from '../../../utils/api';

const CITY_TABS = [
  { key: 'jogja', label: 'Jogja' },
  { key: 'solo', label: 'Solo' },
];

const guessCityFromUser = (user) => {
  const raw = String(user?.location || user?.city || '').toLowerCase();
  if (raw.includes('solo') || raw.includes('surakarta')) return 'solo';
  return 'jogja';
};

const normalizeList = (rows) => (Array.isArray(rows) ? rows : []).filter(Boolean);

const PlaceList = ({ icon, title, items }) => {
  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5">
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
          {icon}
        </div>
        <div>
          <div className="text-sm font-black text-slate-900">{title}</div>
          <div className="text-[11px] text-slate-500 font-medium">Buka lokasi via Google Maps</div>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <div className="text-sm text-slate-400 font-bold bg-slate-50 border border-slate-100 rounded-2xl p-4">
            Belum ada rekomendasi untuk saat ini.
          </div>
        ) : null}

        {items.map((p) => (
          <div
            key={p.id}
            className="rounded-2xl border border-slate-100 bg-slate-50 p-4 flex items-start justify-between gap-4"
          >
            <div className="min-w-0">
              <div className="font-black text-slate-900 truncate">{p.name}</div>
              {p.address ? (
                <div className="mt-1 text-xs text-slate-600 font-bold line-clamp-2">{p.address}</div>
              ) : null}
              {p.description ? (
                <div className="mt-1 text-xs text-slate-500 font-medium line-clamp-2">{p.description}</div>
              ) : null}
            </div>

            {p.maps_url ? (
              <a
                href={p.maps_url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-slate-200 font-black text-slate-700 hover:bg-slate-100 transition"
              >
                <Navigation size={14} /> Maps
              </a>
            ) : (
              <div className="shrink-0 text-[10px] font-black uppercase tracking-widest text-slate-400 pt-1">
                Tanpa link
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default function PlacesSection({ user }) {
  const initialCity = useMemo(() => guessCityFromUser(user), [user]);
  const [city, setCity] = useState(initialCity);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cache, setCache] = useState({
    jogja: { attraction: [], charging: [], loaded: false },
    solo: { attraction: [], charging: [], loaded: false },
  });

  useEffect(() => {
    setCity((prev) => (prev ? prev : initialCity));
  }, [initialCity]);

  useEffect(() => {
    const current = cache?.[city];
    if (!city || current?.loaded) return;

    let cancelled = false;
    setLoading(true);
    setError('');

    Promise.all([
      apiFetch(`/api/places?type=attraction&city=${encodeURIComponent(city)}`),
      apiFetch(`/api/places?type=charging&city=${encodeURIComponent(city)}`),
    ])
      .then(([a, c]) => {
        if (cancelled) return;
        setCache((prev) => ({
          ...prev,
          [city]: {
            attraction: normalizeList(a?.data),
            charging: normalizeList(c?.data),
            loaded: true,
          },
        }));
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message || 'Gagal memuat peta & lokasi.');
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [cache, city]);

  const attraction = cache?.[city]?.attraction || [];
  const charging = cache?.[city]?.charging || [];

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
              <MapPin />
            </div>
            <div>
              <div className="text-lg font-black text-slate-900">Peta & Rekomendasi</div>
              <div className="text-sm text-slate-500 font-medium">
                Daftar tempat populer dan charging station di sekitar kota.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {CITY_TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setCity(t.key)}
                className={`px-4 py-2 rounded-2xl font-black text-sm border transition ${
                  city === t.key
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <div className="mt-4 bg-red-50 text-red-600 p-4 rounded-2xl border border-red-100 font-bold">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="mt-4 flex items-center gap-2 text-slate-500 font-bold">
            <Loader2 className="animate-spin" size={18} /> Memuat data...
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PlaceList icon={<MapPin size={18} />} title="Objek Wisata" items={attraction} />
        <PlaceList icon={<Zap size={18} />} title="Charging Station" items={charging} />
      </div>
    </div>
  );
}

