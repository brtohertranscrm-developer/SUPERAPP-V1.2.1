import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CarFront, MapPin, Users, Zap } from 'lucide-react';

const rupiah = (v) => {
  const n = Number(v) || 0;
  try {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
  } catch {
    return `Rp ${n.toLocaleString('id-ID')}`;
  }
};

export default function CarCard({ car, pickupCity, search, mode = 'availability', onCheckAvailability }) {
  const navigate = useNavigate();
  const title = car?.display_name || car?.name || 'Mobil';
  const seats = Number(car?.seats) || 4;
  const transmission = String(car?.transmission || 'AT').toUpperCase();
  const stock = Number(car?.stock) || 0;

  const key = String(pickupCity || '').trim().toLowerCase().includes('solo') ? 'solo' : 'yogyakarta';
  const localReady = Number(car?.availability_by_location?.[key]) || 0;
  const tag = localReady > 0 ? 'Ready di kota pickup' : 'Perlu diantar dari kota lain';

  return (
    <div className="bg-white rounded-[2.5rem] p-5 shadow-sm border border-slate-100 hover:shadow-md transition">
      <div className="relative overflow-hidden rounded-3xl bg-slate-100 border border-slate-100 h-44">
        {car?.image_url ? (
          <img src={car.image_url} alt={title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300">
            <CarFront size={56} />
          </div>
        )}
        <div className="absolute top-3 left-3">
          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
            stock > 0 ? 'bg-emerald-500/90 text-white' : 'bg-rose-600/90 text-white'
          }`}>
            {stock > 0 ? 'Tersedia' : 'Habis'}
          </span>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-lg font-black text-slate-900 truncate">{title}</div>
            <div className="mt-1 text-xs text-slate-500 font-bold flex items-center gap-2">
              <MapPin size={14} className="text-rose-500" /> {tag}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Mulai dari</div>
            <div className="text-lg font-black text-slate-900">{rupiah(car?.base_price)}</div>
            <div className="text-[10px] text-slate-400 font-bold">/hari</div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <Users size={13} /> Kursi
            </div>
            <div className="mt-1 font-black text-slate-900">{seats}</div>
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <Zap size={13} /> Trans
            </div>
            <div className="mt-1 font-black text-slate-900">{transmission}</div>
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Unit</div>
            <div className="mt-1 font-black text-slate-900">{stock}</div>
          </div>
        </div>

        {car?.description ? (
          <div className="mt-3 text-xs text-slate-500 font-medium leading-relaxed line-clamp-3">
            {car.description}
          </div>
        ) : null}

        <button
          type="button"
          className="mt-4 w-full px-6 py-4 rounded-2xl bg-slate-900 text-white font-black hover:bg-slate-800 transition"
          onClick={() => {
            if (mode === 'catalog') {
              onCheckAvailability?.(car);
              return;
            }
            const startDate = search?.startDate;
            const endDate = search?.endDate;
            if (!startDate || !endDate) {
              alert('Tentukan tanggal pickup & return dulu ya.');
              return;
            }
            const startTime = search?.startTime || '09:00';
            const endTime = search?.endTime || '19:00';
            const startDateTime = `${startDate}T${startTime}:00`;
            const endDateTime = `${endDate}T${endTime}:00`;

            navigate('/checkout-mobil', {
              state: {
                checkout_path: '/checkout-mobil',
                item_type: 'car',
                carId: car?.id,
                carName: title,
                basePrice: car?.base_price,
                pickupCity,
                startDate: startDateTime,
                endDate: endDateTime,
              }
            });
          }}
        >
          {mode === 'catalog' ? 'Cek Ketersediaan' : 'Pilih Mobil Ini'}
        </button>
      </div>
    </div>
  );
}
