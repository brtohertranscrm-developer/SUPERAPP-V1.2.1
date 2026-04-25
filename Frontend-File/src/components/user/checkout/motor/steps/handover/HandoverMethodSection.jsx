import React from 'react';
import { Info, Loader2, MapPin, Wallet, XCircle } from 'lucide-react';
import { formatLatLng } from '../../../../../../utils/geo';
import { fmtRp } from '../../checkoutMotorUtils';

export default function HandoverMethodSection({
  pickupLocation,
  handoverMethod,
  setHandoverMethod,
  deliveryTarget,
  setDeliveryTarget,
  stationId,
  setStationId,
  stations,
  selectedStation,
  isDeliveryLoading,
  deliveryFee,
  deliveryAddress,
  setDeliveryAddress,
  mapsInput,
  setMapsInput,
  parsedLatLng,
  deliveryQuote,
  deliveryError,
  setDeliveryError,
  requestDeliveryQuote,
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <h3 className="font-black text-slate-900 mb-4 flex items-center gap-2 text-sm uppercase tracking-widest">
        <MapPin size={16} className="text-slate-500" /> Serah Terima Unit
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setHandoverMethod('self')}
          className={`p-4 rounded-2xl border-2 text-left transition-all active:scale-[0.99] ${
            handoverMethod === 'self'
              ? 'border-slate-900 bg-slate-50'
              : 'border-slate-200 hover:border-slate-300 bg-white'
          }`}
        >
          <p className="text-xs font-black text-slate-900">Ambil Sendiri</p>
          <p className="text-[11px] font-medium text-slate-500 mt-1">
            Gratis, ambil di titik {pickupLocation}
          </p>
        </button>

        <button
          type="button"
          onClick={() => setHandoverMethod('delivery')}
          className={`p-4 rounded-2xl border-2 text-left transition-all active:scale-[0.99] ${
            handoverMethod === 'delivery'
              ? 'border-slate-900 bg-slate-50'
              : 'border-slate-200 hover:border-slate-300 bg-white'
          }`}
        >
          <p className="text-xs font-black text-slate-900">Minta Diantar</p>
          <p className="text-[11px] font-medium text-slate-500 mt-1">
            Gratis untuk stasiun tertentu, di luar itu ada biaya
          </p>
        </button>
      </div>

      {handoverMethod === 'delivery' && (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setDeliveryTarget('station')}
              className={`p-4 rounded-2xl border-2 text-left transition-all active:scale-[0.99] ${
                deliveryTarget === 'station'
                  ? 'border-emerald-600 bg-emerald-50/40'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <p className="text-xs font-black text-slate-900">Stasiun</p>
              <p className="text-[11px] font-medium text-slate-500 mt-1">
                Beberapa stasiun gratis, akan ditandai di daftar
              </p>
            </button>

            <button
              type="button"
              onClick={() => setDeliveryTarget('address')}
              className={`p-4 rounded-2xl border-2 text-left transition-all active:scale-[0.99] ${
                deliveryTarget === 'address'
                  ? 'border-emerald-600 bg-emerald-50/40'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <p className="text-xs font-black text-slate-900">Alamat Lain</p>
              <p className="text-[11px] font-medium text-slate-500 mt-1">
                Rp 15.000 (0-3km) + Rp 5.000/km berikutnya
              </p>
            </button>
          </div>

          {deliveryTarget === 'station' && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                Pilih Stasiun
              </p>
              <select
                value={stationId}
                onChange={(e) => setStationId(e.target.value)}
                className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                {stations.length === 0 ? (
                  <option value="">Memuat...</option>
                ) : (
                  stations.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.city})
                      {s.is_free ? ' • Gratis' : ''}
                    </option>
                  ))
                )}
              </select>
              <p className="text-xs text-emerald-700 font-black mt-2">
                {isDeliveryLoading
                  ? 'Menghitung...'
                  : deliveryFee === 0 || selectedStation?.is_free
                    ? 'Biaya: Gratis'
                    : `Biaya: ${fmtRp(deliveryFee)}`}
              </p>
            </div>
          )}

          {deliveryTarget === 'address' && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                  Alamat (opsional)
                </p>
                <input
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="Contoh: Jl. Malioboro No. 1, Jogja"
                />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                  Link Google Maps / Koordinat
                </p>
                <input
                  value={mapsInput}
                  onChange={(e) => setMapsInput(e.target.value)}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="Tempel link Google Maps atau: -7.79,110.37"
                />
                <p className="text-[11px] text-slate-500 font-medium mt-1">
                  Tip: di Google Maps tekan tahan lokasi sampai pin muncul, lalu Share → Copy link.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!parsedLatLng) {
                    setDeliveryError(
                      'Koordinat tidak terbaca. Tempel link Google Maps yang berisi pin lokasi.'
                    );
                    return;
                  }
                  requestDeliveryQuote({
                    type: 'address',
                    lat: parsedLatLng.lat,
                    lng: parsedLatLng.lng,
                    address: deliveryAddress || null,
                  });
                }}
                disabled={isDeliveryLoading}
                className="w-full py-3 bg-emerald-600 text-white font-black rounded-xl hover:bg-slate-900 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isDeliveryLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Wallet size={16} />
                )}
                Hitung Ulang Estimasi
              </button>

              <button
                type="button"
                onClick={() => {
                  setDeliveryError('');
                  if (!navigator?.geolocation) {
                    setDeliveryError('Browser tidak mendukung GPS.');
                    return;
                  }
                  navigator.geolocation.getCurrentPosition(
                    (pos) => {
                      const lat = pos.coords.latitude;
                      const lng = pos.coords.longitude;
                      const text = formatLatLng(lat, lng);
                      setMapsInput(text);
                      requestDeliveryQuote({
                        type: 'address',
                        lat,
                        lng,
                        address: deliveryAddress || null,
                      });
                    },
                    () =>
                      setDeliveryError(
                        'Gagal mengambil lokasi. Pastikan izin lokasi (GPS) diizinkan.'
                      ),
                    { enableHighAccuracy: true, timeout: 8000 }
                  );
                }}
                disabled={isDeliveryLoading}
                className="w-full py-3 bg-white text-slate-900 font-black rounded-xl border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <MapPin size={16} /> Gunakan Lokasi Saya
              </button>

              {parsedLatLng && (
                <p className="text-[11px] text-slate-500 font-medium">
                  Koordinat terbaca:{' '}
                  <span className="font-mono font-black">
                    {formatLatLng(parsedLatLng.lat, parsedLatLng.lng)}
                  </span>
                </p>
              )}

              {deliveryQuote && (
                <div className="bg-white border border-emerald-200 rounded-2xl p-4">
                  <p className="text-xs font-black text-slate-900">
                    Estimasi biaya:{' '}
                    <span className="text-emerald-700">{fmtRp(deliveryQuote.fee)}</span>
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium mt-1">
                    Jarak: {deliveryQuote.distance_km} km ({deliveryQuote.method})
                  </p>
                  <p className="text-[11px] text-amber-700 font-bold mt-2">
                    Catatan: estimasi jarak dihitung garis lurus (tanpa Maps API). Biaya final bisa disesuaikan admin.
                  </p>
                </div>
              )}

              {deliveryError && (
                <p className="text-rose-600 text-xs font-bold flex items-center gap-1.5">
                  <XCircle size={12} /> {deliveryError}
                </p>
              )}
            </div>
          )}

          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-start gap-2">
            <Info size={14} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 font-medium">
              Biaya pengantaran dihitung otomatis. Admin masih bisa melakukan penyesuaian saat konfirmasi jika ada kondisi khusus.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

