import { useContext } from 'react';
import { CityContext } from '../context/CityContext';
import { MapPin, Building2 } from 'lucide-react';

export default function CitySelector() {
  const { selectedCity, changeCity } = useContext(CityContext);

  if (selectedCity) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-dark/70 backdrop-blur-md p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg p-10 text-center animate-fade-in-up">
        <h2 className="text-3xl font-extrabold text-brand-dark mb-3">
          Mau ke mana hari ini?
        </h2>
        <p className="text-gray-500 mb-10 text-lg leading-relaxed">
          Pilih kota tujuan Anda untuk melihat ketersediaan armada dan loker Brother Trans.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Tombol Yogyakarta */}
          <button 
            onClick={() => changeCity('Yogyakarta')}
            className="group p-8 border-2 border-gray-50 rounded-3xl hover:border-brand-primary hover:bg-rose-50/30 transition-all duration-300"
          >
            <div className="w-20 h-20 bg-rose-100 text-brand-primary rounded-2xl flex items-center justify-center mx-auto mb-5 group-hover:rotate-6 transition-transform">
              <Building2 size={40} />
            </div>
            <span className="text-xl font-bold text-brand-dark block">Yogyakarta</span>
            <span className="text-sm text-gray-400 mt-1 uppercase tracking-wider">Kota Gudeg</span>
          </button>

          {/* Tombol Solo */}
          <button 
            onClick={() => changeCity('Solo')}
            className="group p-8 border-2 border-gray-50 rounded-3xl hover:border-brand-primary hover:bg-rose-50/30 transition-all duration-300"
          >
            <div className="w-20 h-20 bg-rose-100 text-brand-primary rounded-2xl flex items-center justify-center mx-auto mb-5 group-hover:-rotate-6 transition-transform">
              <MapPin size={40} />
            </div>
            <span className="text-xl font-bold text-brand-dark block">Solo</span>
            <span className="text-sm text-gray-400 mt-1 uppercase tracking-wider">Spirit of Java</span>
          </button>
        </div>
      </div>
    </div>
  );
}