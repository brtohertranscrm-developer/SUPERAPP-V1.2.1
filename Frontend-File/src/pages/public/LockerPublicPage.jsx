import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Lock, Shield, Clock, MapPin, Zap, Package,
  ChevronRight, Check, Star, Smartphone
} from 'lucide-react';
import { CityContext } from '../../context/CityContext';

// ─────────────────────────── DATA ───────────────────────────
const LOCKER_SIZES = [
  {
    id: 'Medium',
    label: 'Medium',
    icon: '🎒',
    desc: 'Tas ransel, koper kabin',
    dim: '40 × 30 × 20 cm',
    price: 25000,
  },
  {
    id: 'Large',
    label: 'Large',
    icon: '🧳',
    desc: 'Koper besar, sepeda lipat',
    dim: '60 × 45 × 30 cm',
    price: 40000,
  },
];

const FEATURES = [
  { icon: <Shield size={22} />, title: 'CCTV 24/7', desc: 'Area selalu terawasi' },
  { icon: <Smartphone size={22} />, title: 'Buka via QR', desc: 'Tanpa kunci fisik' },
  { icon: <Zap size={22} />, title: 'Booking Instan', desc: 'Langsung aktif' },
  { icon: <Clock size={22} />, title: 'Tersedia 24 Jam', desc: 'Akses kapan saja' },
];

const LOCATIONS = {
  Yogyakarta: {
    label: 'Yogyakarta',
    sub: 'Pusat Kota Yogyakarta',
    emoji: '🏯',
    color: 'from-rose-600 to-rose-800',
  },
  Solo: {
    label: 'Solo',
    sub: 'Pusat Kota Solo',
    emoji: '🎭',
    color: 'from-blue-600 to-blue-800',
  },
};

// ─────────────────────────── COMPONENT ───────────────────────────
const LockerPublicPage = () => {
  const navigate  = useNavigate();
  const { selectedCity } = useContext(CityContext) || {};

  const today = new Date().toISOString().split('T')[0];
  const tomorrow = (() => {
    const d = new Date(); d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  })();

  const [city,      setCity]      = useState(selectedCity || 'Yogyakarta');
  const [size,      setSize]      = useState('Medium');
  const [startDate, setStartDate] = useState(today);
  const [endDate,   setEndDate]   = useState(tomorrow);

  const selectedSize = LOCKER_SIZES.find(l => l.id === size);

  const totalDays = (() => {
    const diff = Math.ceil((new Date(endDate) - new Date(startDate)) / 86400000);
    return diff > 0 ? diff : 1;
  })();

  const totalPrice = selectedSize.price * totalDays;

  const handleBook = () => {
    if (!startDate || !endDate) return;
    navigate('/checkout-loker', {
      state: {
        location:  city,
        size,
        startDate,
        endDate,
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">

      {/* ── HERO ── */}
      <div className="relative bg-slate-950 text-white overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-rose-600/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-blue-600/15 rounded-full blur-[100px]" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 pt-28 pb-16 text-center">
          <span className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/10 text-white/80 text-[10px] font-black uppercase tracking-[0.25em] px-4 py-2 rounded-full mb-8">
            <Lock size={12} className="text-rose-400" /> Smart Loker Brother Trans
          </span>
          <h1 className="text-5xl md:text-6xl font-black tracking-tight leading-none mb-6">
            Titip Tas,<br />
            <span className="text-rose-500">Bebas Jalan.</span>
          </h1>
          <p className="text-slate-400 text-lg font-medium max-w-xl mx-auto mb-10">
            Smart Loker otomatis di Yogyakarta & Solo. Aman, instan, buka pakai QR — bukan gembok.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {FEATURES.map(f => (
              <div key={f.title} className="flex items-center gap-2 bg-white/8 border border-white/10 px-4 py-2.5 rounded-full text-sm font-bold text-slate-300">
                <span className="text-rose-400">{f.icon}</span> {f.title}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── BOOKING FORM ── */}
      <div className="max-w-5xl mx-auto px-4 -mt-8 relative z-20">
        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-900/10 border border-slate-100 overflow-hidden">

          {/* Pilih Kota */}
          <div className="p-8 border-b border-slate-100">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-5">
              Pilih Kota
            </div>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(LOCATIONS).map(([key, loc]) => (
                <button
                  key={key}
                  onClick={() => setCity(key)}
                  className={`relative group p-5 rounded-2xl border-2 text-left transition-all duration-200 overflow-hidden ${
                    city === key
                      ? 'border-rose-500 bg-rose-50'
                      : 'border-slate-100 bg-slate-50 hover:border-slate-200'
                  }`}
                >
                  {city === key && (
                    <div className="absolute top-3 right-3 w-6 h-6 bg-rose-500 rounded-full flex items-center justify-center">
                      <Check size={12} className="text-white" strokeWidth={3} />
                    </div>
                  )}
                  <div className="text-3xl mb-2">{loc.emoji}</div>
                  <div className={`text-lg font-black ${city === key ? 'text-rose-600' : 'text-slate-800'}`}>
                    {loc.label}
                  </div>
                  <div className="text-xs font-medium text-slate-400">{loc.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Pilih Ukuran */}
          <div className="p-8 border-b border-slate-100">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-5">
              Pilih Ukuran Loker
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {LOCKER_SIZES.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSize(s.id)}
                  className={`relative p-5 rounded-2xl border-2 text-left transition-all duration-200 ${
                    size === s.id
                      ? 'border-rose-500 bg-rose-50'
                      : 'border-slate-100 bg-slate-50 hover:border-slate-200'
                  }`}
                >
                  {size === s.id && (
                    <div className="absolute top-3 right-3 w-6 h-6 bg-rose-500 rounded-full flex items-center justify-center">
                      <Check size={12} className="text-white" strokeWidth={3} />
                    </div>
                  )}
                  <div className="text-3xl mb-2">{s.icon}</div>
                  <div className={`text-base font-black mb-0.5 ${size === s.id ? 'text-rose-600' : 'text-slate-800'}`}>
                    Loker {s.label}
                  </div>
                  <div className="text-xs text-slate-500 font-medium mb-2">{s.desc}</div>
                  <div className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full inline-block">
                    {s.dim}
                  </div>
                  <div className={`mt-3 text-lg font-black ${size === s.id ? 'text-rose-500' : 'text-slate-700'}`}>
                    Rp {s.price.toLocaleString('id-ID')}
                    <span className="text-xs font-bold text-slate-400"> /hari</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Tanggal */}
          <div className="p-8 border-b border-slate-100">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-5">
              Durasi Penyimpanan
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                  Mulai Titip
                </label>
                <input
                  type="date"
                  value={startDate}
                  min={today}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                  Selesai Titip
                </label>
                <input
                  type="date"
                  value={endDate}
                  min={startDate || today}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Ringkasan & CTA */}
          <div className="p-8 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="w-full sm:w-auto">
              <div className="flex items-center gap-2 mb-1">
                <MapPin size={14} className="text-rose-500" />
                <span className="text-sm font-black text-slate-700">{city}</span>
                <span className="text-slate-300">·</span>
                <Package size={14} className="text-slate-400" />
                <span className="text-sm font-bold text-slate-500">Loker {size}</span>
                <span className="text-slate-300">·</span>
                <Clock size={14} className="text-slate-400" />
                <span className="text-sm font-bold text-slate-500">{totalDays} Hari</span>
              </div>
              <div className="text-3xl font-black text-slate-900">
                Rp {totalPrice.toLocaleString('id-ID')}
                <span className="text-sm font-bold text-slate-400 ml-2">total</span>
              </div>
            </div>

            <button
              onClick={handleBook}
              disabled={!startDate || !endDate}
              className="w-full sm:w-auto flex items-center justify-center gap-3 bg-slate-900 hover:bg-rose-500 disabled:bg-slate-300 text-white font-black text-sm px-10 py-4 rounded-2xl transition-all shadow-lg shadow-slate-900/20 active:scale-95"
            >
              Pesan Sekarang <ChevronRight size={20} />
            </button>
          </div>

        </div>
      </div>

      {/* ── INFO LOKASI ── */}
      <div className="max-w-5xl mx-auto px-4 mt-20 mb-16">
        <h2 className="text-2xl font-black text-slate-900 mb-2">Lokasi Smart Loker</h2>
        <p className="text-slate-500 font-medium mb-8">Tersedia di dua kota, strategis dan mudah dijangkau.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(LOCATIONS).map(([key, loc]) => (
            <div key={key} className={`bg-gradient-to-br ${loc.color} text-white rounded-[2rem] p-7 relative overflow-hidden`}>
              <div className="absolute -bottom-6 -right-6 text-[100px] opacity-20 select-none">{loc.emoji}</div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <MapPin size={20} className="text-white" />
                  </div>
                  <div>
                    <div className="font-black text-lg leading-tight">{loc.label}</div>
                    <div className="text-white/70 text-xs font-medium">{loc.sub}</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  {['CCTV 24/7', 'Akses QR', 'Parkir Motor', 'Wi-Fi Area'].map(tag => (
                    <span key={tag} className="bg-white/20 text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest">
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="mt-5 flex items-center gap-2 text-white/60 text-xs font-bold">
                  <Star size={12} className="text-yellow-400 fill-yellow-400" />
                  4.9 · Lebih dari 500 pengguna
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default LockerPublicPage;
