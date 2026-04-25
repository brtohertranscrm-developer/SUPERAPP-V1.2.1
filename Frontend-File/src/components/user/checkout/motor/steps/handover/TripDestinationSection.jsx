import React from 'react';
import { Info, MapPin, XCircle } from 'lucide-react';

export default function TripDestinationSection({
  tripScope,
  setTripScope,
  tripDestination,
  setTripDestination,
  tripDestinationError,
  setTripDestinationError,
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <h3 className="font-black text-slate-900 mb-4 flex items-center gap-2 text-sm uppercase tracking-widest">
        <MapPin size={16} className="text-slate-500" /> Tujuan Perjalanan
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setTripScope('local')}
          className={`p-4 rounded-2xl border-2 text-left transition-all active:scale-[0.99] ${
            tripScope === 'local'
              ? 'border-slate-900 bg-slate-50'
              : 'border-slate-200 hover:border-slate-300 bg-white'
          }`}
        >
          <p className="text-xs font-black text-slate-900">Dalam Kota</p>
          <p className="text-[11px] font-medium text-slate-500 mt-1">
            Dipakai di area Jogja / Solo
          </p>
        </button>

        <button
          type="button"
          onClick={() => setTripScope('out_of_town')}
          className={`p-4 rounded-2xl border-2 text-left transition-all active:scale-[0.99] ${
            tripScope === 'out_of_town'
              ? 'border-amber-600 bg-amber-50/50'
              : 'border-slate-200 hover:border-slate-300 bg-white'
          }`}
        >
          <p className="text-xs font-black text-slate-900">Luar Kota</p>
          <p className="text-[11px] font-medium text-slate-500 mt-1">
            Admin akan menambahkan biaya Rp 50.000
          </p>
        </button>
      </div>

      <div className="mt-4">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
          Tujuan Perjalanan
        </p>
        <input
          value={tripDestination}
          onChange={(e) => {
            setTripDestination(e.target.value);
            if (tripDestinationError) setTripDestinationError('');
          }}
          className={`w-full p-3 bg-white border rounded-xl font-bold focus:ring-2 outline-none ${
            tripDestinationError
              ? 'border-rose-300 focus:ring-rose-500'
              : 'border-slate-200 focus:ring-slate-900'
          }`}
          placeholder="Contoh: Magelang / Klaten / Gunung Kidul"
        />
        <p className="text-[11px] text-slate-500 font-medium mt-1">
          Info ini membantu admin memastikan aturan pemakaian unit.
        </p>
        {tripDestinationError && (
          <p className="text-rose-600 text-xs font-black mt-2 flex items-center gap-1.5">
            <XCircle size={12} /> {tripDestinationError}
          </p>
        )}
      </div>

      {tripScope === 'out_of_town' && (
        <div className="mt-4 bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-start gap-2">
          <Info size={14} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 font-medium">
            Catatan: biaya luar kota <span className="font-black">Rp 50.000</span>{' '}
            akan ditambahkan oleh admin saat konfirmasi.
          </p>
        </div>
      )}
    </div>
  );
}

