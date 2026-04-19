import React, { useState } from 'react';
import { Package, Lock, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLockerCatalog } from '../../hooks/useLockerCatalog';
import LockerCard from '../../components/public/catalog/LockerCard';
import LockerHero from '../../components/public/catalog/LockerHero';

const FILTER_TYPES = [
  { value: 'all',      label: 'Semua Tipe' },
  { value: 'terbuka',  label: 'Rak Terbuka',  Icon: Package },
  { value: 'tertutup', label: 'Rak Tertutup',  Icon: Lock },
];

const LockerCatalog = () => {
  const navigate = useNavigate();
  const [filterType, setFilterType]       = useState('all');
  const [selectedLocker, setSelectedLocker] = useState(null);
  const { lockers, isLoading }            = useLockerCatalog();

  const filtered = filterType === 'all'
    ? lockers
    : lockers.filter(l => l.type === filterType);

  // Grup berdasarkan lokasi
  const byLocation = filtered.reduce((acc, l) => {
    if (!acc[l.location]) acc[l.location] = [];
    acc[l.location].push(l);
    return acc;
  }, {});

  // [FIX] Gunakan navigate() dari React Router — bukan window.location.href
  // Pass data loker via state agar checkout bisa baca tanpa query string
  const handleSelect = (locker) => {
    setSelectedLocker(locker);
    navigate('/checkout-loker', {
      state: {
        lockerId:  locker.id,
        location:  locker.location,
        size:      locker.type || locker.size || 'Medium',
        basePrice: locker.base_price || locker.price_24h || 0,
        name:      locker.name || `Loker ${locker.type}`,
      },
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <LockerHero />

      <div className="max-w-screen-xl mx-auto px-4 py-10 space-y-8">

        {/* Filter Tipe */}
        <div className="flex flex-wrap gap-2">
          {FILTER_TYPES.map(({ value, label, Icon }) => (
            <button
              key={value}
              onClick={() => setFilterType(value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                filterType === value
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600'
              }`}
            >
              {Icon && <Icon size={15} />}
              {label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="text-center py-20 text-slate-400 font-bold">
            Memuat loker...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-400 font-bold">
            Tidak ada loker tersedia
          </div>
        ) : (
          Object.entries(byLocation).map(([location, items]) => (
            <div key={location}>
              <div className="flex items-center gap-2 mb-4">
                <MapPin size={16} className="text-slate-400" />
                <h2 className="text-sm font-black text-slate-600 uppercase tracking-widest">{location}</h2>
                <span className="text-xs text-slate-400 font-medium">{items.length} pilihan</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {items.map((locker) => (
                  <LockerCard
                    key={locker.id}
                    locker={locker}
                    isSelected={selectedLocker?.id === locker.id}
                    onSelect={handleSelect}
                  />
                ))}
              </div>
            </div>
          ))
        )}

      </div>
    </div>
  );
};

export default LockerCatalog;
