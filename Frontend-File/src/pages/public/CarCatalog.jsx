import React from 'react';
import { Loader2, XCircle } from 'lucide-react';
import { useCarCatalog } from '../../hooks/useCarCatalog';
import CarHero from '../../components/public/catalog/CarHero';
import CarAvailabilitySearch from '../../components/public/catalog/CarAvailabilitySearch';
import CarCard from '../../components/public/catalog/CarCard';
import TrustBadges from '../../components/public/common/TrustBadges';
import FaqSection from '../../components/public/common/FaqSection';
import TwoButtonCta from '../../components/public/common/TwoButtonCta';

export default function CarCatalog() {
  const {
    searchRef,
    form,
    setForm,
    activeSearch,
    cars,
    isLoading,
    error,
    handleSubmit,
  } = useCarCatalog();

  const cityKey = String(form?.pickupCity || '').toLowerCase().includes('solo') ? 'solo' : 'jogja';

  return (
    <div className="bg-slate-50 min-h-screen pb-20 text-slate-900 font-sans">
      <CarHero />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <CarAvailabilitySearch form={form} setForm={setForm} onSubmit={handleSubmit} isLoading={isLoading} />

        <div ref={searchRef} className="pt-10">
          {error ? (
            <div className="bg-red-50 text-red-600 p-6 rounded-[2rem] border border-red-100 text-center font-bold shadow-lg mb-8">
              <XCircle size={48} className="mx-auto mb-2 opacity-50" /> {error}
            </div>
          ) : null}

          {isLoading && !error ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2rem] shadow-sm border border-slate-100">
              <Loader2 size={48} className="text-rose-500 animate-spin mb-4" />
              <p className="font-bold text-slate-400 animate-pulse">Memeriksa ketersediaan mobil...</p>
            </div>
          ) : null}

          {!isLoading && !error && (
            <>
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-7">
                <div className="text-sm font-bold text-slate-600 bg-white px-5 py-3 rounded-2xl border border-slate-200 shadow-sm">
                  Menampilkan <span className="font-black text-slate-900">{cars.length}</span> mobil tersedia
                  <span className="text-slate-400"> • </span>
                  Pickup: <span className="font-black text-rose-600">{activeSearch.pickupCity}</span>
                </div>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-white px-5 py-3 rounded-2xl border border-slate-200 shadow-sm">
                  Availability First
                </div>
              </div>

              {cars.length === 0 ? (
                <div className="bg-white p-12 rounded-[2rem] shadow-sm border border-slate-100 text-center">
                  <XCircle size={48} className="text-slate-300 mx-auto mb-4" />
                  <h3 className="text-2xl font-black text-slate-900 mb-2">Mobil Habis</h3>
                  <p className="text-slate-500 font-medium">
                    Coba ubah jam atau tanggal. Karena unit terbatas, ketersediaan mobil sangat bergantung pada jadwal.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
                  {cars.map((car) => (
                    <CarCard key={car.id} car={car} pickupCity={activeSearch.pickupCity} search={activeSearch} />
                  ))}
                </div>
              )}

              <div className="text-center text-xs text-slate-500 font-semibold leading-relaxed max-w-2xl mx-auto">
                Unit dan warna kendaraan akan disesuaikan dengan stok yang tersedia. Foto di katalog adalah ilustrasi, kami akan berikan unit terbaik yang tersedia.
              </div>

              <div className="mt-12 space-y-10">
                <TrustBadges />

                <FaqSection
                  title="FAQ Sewa Mobil"
                  faqs={[
                    { q: 'Kenapa harus pilih jadwal dulu?', a: 'Karena unit mobil terbatas dan bisa antar lintas kota, ketersediaan tergantung jam pickup dan durasi sewa.' },
                    { q: 'Bisa pilih kota pickup?', a: 'Bisa. Pilih “Kota Pickup” pada form.' },
                    { q: 'Kalau mobilnya ada di kota lain bagaimana?', a: 'Admin akan atur reposisi setelah booking (sesuai kebijakan dan ketersediaan).' },
                    { q: 'Kalau tidak ada hasil mobil tersedia?', a: 'Coba ubah tanggal/jam. Ketersediaan sangat bergantung pada jadwal.' },
                    { q: 'Butuh bantuan cepat?', a: 'Klik WhatsApp untuk chat admin cabang.' },
                  ]}
                />

                <TwoButtonCta
                  city={cityKey}
                  serviceLabel="sewa mobil"
                  primaryLabel="Mulai Booking"
                  onPrimaryClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
