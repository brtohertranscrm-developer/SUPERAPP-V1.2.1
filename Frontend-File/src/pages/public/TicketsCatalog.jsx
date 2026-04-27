import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, MapPin, Ticket, Tag } from 'lucide-react';
import { API_BASE_URL } from '../../utils/api';

const rupiah = (v) => {
  const n = Number(v) || 0;
  try {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
  } catch {
    return `Rp ${n.toLocaleString('id-ID')}`;
  }
};

const CITIES = [
  { key: '', label: 'Semua' },
  { key: 'jogja', label: 'Jogja' },
  { key: 'solo', label: 'Solo' },
];

const CATEGORIES = [
  { key: '', label: 'Semua' },
  { key: 'attraction', label: 'Attraction' },
  { key: 'museum', label: 'Museum' },
  { key: 'concert', label: 'Konser' },
  { key: 'event', label: 'Event' },
  { key: 'tour', label: 'Tour' },
];

export default function TicketsCatalog() {
  const navigate = useNavigate();
  const [city, setCity] = useState('');
  const [category, setCategory] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (city) p.set('city', city);
    if (category) p.set('category', category);
    return p.toString();
  }, [city, category]);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setIsLoading(true);
      setError('');
      try {
        const res = await fetch(`${API_BASE_URL}/api/tickets/products${qs ? `?${qs}` : ''}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.success) throw new Error(data?.error || 'Gagal memuat tiket.');
        if (!mounted) return;
        setItems(Array.isArray(data.data) ? data.data : []);
      } catch (e) {
        if (!mounted) return;
        setItems([]);
        setError(e?.message || 'Gagal memuat tiket.');
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    // eslint-disable-next-line no-void
    void run();
    return () => { mounted = false; };
  }, [qs]);

  return (
    <div className="bg-slate-50 min-h-screen pb-20 text-slate-900 font-sans">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Tiket Wisata & Event</h1>
            <p className="text-slate-500 font-medium mt-2 max-w-2xl">
              Voucher digital resmi partner. Pilih tanggal kunjungan, bayar, lalu tukarkan di vendor.
            </p>
          </div>
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-white px-5 py-3 rounded-2xl border border-slate-200 shadow-sm inline-flex items-center gap-2">
            <Ticket size={14} /> Voucher Digital
          </div>
        </div>

        <div className="mt-7 bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex flex-wrap gap-2">
              {CITIES.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setCity(c.key)}
                  className={`px-4 py-2 rounded-full text-xs font-black border transition ${
                    city === c.key
                      ? 'bg-rose-500 text-white border-rose-500'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 lg:ml-auto">
              {CATEGORIES.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setCategory(c.key)}
                  className={`px-4 py-2 rounded-full text-xs font-black border transition ${
                    category === c.key
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8">
          {error ? (
            <div className="bg-red-50 text-red-600 p-6 rounded-[2rem] border border-red-100 text-center font-bold shadow-lg">
              {error}
            </div>
          ) : null}

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2rem] shadow-sm border border-slate-100">
              <Loader2 size={48} className="text-rose-500 animate-spin mb-4" />
              <p className="font-bold text-slate-400 animate-pulse">Memuat tiket...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {items.map((it) => (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => navigate(`/tiket/${it.slug}`)}
                  className="text-left bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden hover:shadow-lg transition"
                >
                  <div className="relative h-44 bg-slate-100">
                    {it.cover_image_url ? (
                      <img src={it.cover_image_url} alt={it.title} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <Ticket size={56} />
                      </div>
                    )}
                    <div className="absolute top-4 left-4 flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-white/90 backdrop-blur-sm border border-white/20">
                        <Tag size={12} className="inline -mt-0.5" /> {String(it.category || 'tiket').toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="text-lg font-black text-slate-900 line-clamp-2">{it.title}</div>
                    <div className="mt-2 text-xs font-bold text-slate-500 flex items-center gap-2">
                      <MapPin size={14} className="text-rose-500" />
                      <span className="truncate">{it.city || '-'}</span>
                    </div>
                    <div className="mt-5 flex items-end justify-between gap-3">
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Mulai dari</div>
                        <div className="text-xl font-black text-rose-600">{rupiah(it.min_price)}</div>
                      </div>
                      <div className="px-4 py-3 rounded-2xl bg-slate-900 text-white font-black text-sm">
                        Lihat Detail
                      </div>
                    </div>
                  </div>
                </button>
              ))}
              {items.length === 0 ? (
                <div className="col-span-full bg-white p-12 rounded-[2rem] shadow-sm border border-slate-100 text-center">
                  <div className="text-2xl font-black text-slate-900 mb-2">Belum ada tiket</div>
                  <p className="text-slate-500 font-medium">Admin bisa menambahkan produk & varian di menu Admin → Ticketing.</p>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

