'use strict';

// Delivery pricing rules:
// - Free to specific stations per city (Solo Balapan for Solo, Lempuyangan for Yogyakarta)
// - Outside station: Rp 15.000 for first 0-3 km + Rp 5.000 per km after that (rounded up per km)
//
// Distance calculation:
// - If GOOGLE_MAPS_API_KEY is set, we'll try Google Distance Matrix (driving distance).
// - Otherwise fallback to haversine (straight line) as an approximation.

const GOOGLE_KEY = process.env.GOOGLE_MAPS_API_KEY || '';

// Fixed reference points (stations) used as origins per city.
// Coordinates sourced from OpenStreetMap/Mapcarta.
const STATIONS = [
  {
    id: 'solo_balapan',
    city: 'Solo',
    name: 'Stasiun Solo Balapan',
    lat: -7.55695,
    lng: 110.8211,
    is_free: true,
  },
  {
    id: 'jogja_lempuyangan',
    city: 'Yogyakarta',
    name: 'Stasiun Lempuyangan',
    lat: -7.79029,
    lng: 110.37552,
    is_free: true,
  },
];

const normalizeCity = (raw = '') => {
  const s = String(raw || '').trim().toLowerCase();
  if (!s) return '';
  if (s.includes('solo')) return 'Solo';
  if (s.includes('surakarta')) return 'Solo';
  if (s.includes('jogja')) return 'Yogyakarta';
  if (s.includes('yogyakarta')) return 'Yogyakarta';
  return raw.trim();
};

const isValidLatLng = (lat, lng) => {
  const a = Number(lat);
  const b = Number(lng);
  return Number.isFinite(a) && Number.isFinite(b) && a >= -90 && a <= 90 && b >= -180 && b <= 180;
};

const haversineKm = (lat1, lon1, lat2, lon2) => {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const getFreeStationForCity = (cityRaw) => {
  const city = normalizeCity(cityRaw);
  return STATIONS.find((s) => s.city === city && s.is_free) || null;
};

const listStationsByCity = (cityRaw) => {
  const city = normalizeCity(cityRaw);
  if (!city) return STATIONS.slice();
  return STATIONS.filter((s) => s.city === city);
};

const isSameStation = (station, lat, lng) => {
  if (!station || !isValidLatLng(lat, lng)) return false;
  const km = haversineKm(station.lat, station.lng, Number(lat), Number(lng));
  return km <= 0.25; // within 250m treated as station
};

const getDrivingDistanceKm = async (origin, dest) => {
  // Node 18+ has global fetch.
  if (!GOOGLE_KEY) return null;
  try {
    const origins = `${origin.lat},${origin.lng}`;
    const destinations = `${dest.lat},${dest.lng}`;
    const url =
      'https://maps.googleapis.com/maps/api/distancematrix/json' +
      `?origins=${encodeURIComponent(origins)}` +
      `&destinations=${encodeURIComponent(destinations)}` +
      `&mode=driving&units=metric&key=${encodeURIComponent(GOOGLE_KEY)}`;

    const res = await fetch(url);
    const json = await res.json();
    const element = json?.rows?.[0]?.elements?.[0];
    const meters = element?.distance?.value;
    if (json?.status !== 'OK' || element?.status !== 'OK' || !Number.isFinite(Number(meters))) {
      return null;
    }
    return Number(meters) / 1000;
  } catch {
    return null;
  }
};

const computeFeeFromDistanceKm = (distanceKm) => {
  const d = Math.max(0, Number(distanceKm) || 0);
  const base = 15000;
  if (d <= 3) return base;
  const extraKm = Math.ceil(d - 3);
  return base + extraKm * 5000;
};

// Quote delivery fee for a booking city + target.
// target:
// - { type: 'station', station_id?: string }
// - { type: 'address', lat: number, lng: number, address?: string }
const quoteDelivery = async ({ city, target }) => {
  const station = getFreeStationForCity(city);
  if (!station) {
    return { ok: false, error: 'Kota tidak didukung untuk layanan pengantaran.' };
  }

  const type = target?.type;
  if (type === 'station') {
    // Free only for the station that belongs to the chosen city.
    return {
      ok: true,
      fee: 0,
      distance_km: 0,
      currency: 'IDR',
      pricing: { base_fee: 0, radius_km: 0, per_km_fee: 0 },
      origin: station,
      destination: { ...station },
      method: 'station_free',
    };
  }

  if (type !== 'address') {
    return { ok: false, error: 'Target pengantaran tidak valid.' };
  }

  const lat = target?.lat;
  const lng = target?.lng;
  if (!isValidLatLng(lat, lng)) {
    return { ok: false, error: 'Koordinat lokasi tidak valid. Tempel link Google Maps atau pin lokasi.' };
  }

  // If the destination is basically the station, treat it as free.
  if (isSameStation(station, lat, lng)) {
    return {
      ok: true,
      fee: 0,
      distance_km: 0,
      currency: 'IDR',
      pricing: { base_fee: 0, radius_km: 0, per_km_fee: 0 },
      origin: station,
      destination: { lat: Number(lat), lng: Number(lng) },
      method: 'station_free_by_radius',
    };
  }

  const origin = { lat: station.lat, lng: station.lng };
  const dest = { lat: Number(lat), lng: Number(lng) };

  let distanceKm = await getDrivingDistanceKm(origin, dest);
  let method = 'google_driving';
  if (!distanceKm) {
    distanceKm = haversineKm(origin.lat, origin.lng, dest.lat, dest.lng);
    method = 'haversine';
  }

  // Guardrail: prevent obviously wrong/out-of-area coords
  if (distanceKm > 80) {
    return { ok: false, error: 'Lokasi terlalu jauh untuk layanan pengantaran. Silakan hubungi admin.' };
  }

  const fee = computeFeeFromDistanceKm(distanceKm);

  return {
    ok: true,
    fee,
    distance_km: Number(distanceKm.toFixed(2)),
    currency: 'IDR',
    pricing: { base_fee: 15000, radius_km: 3, per_km_fee: 5000, rounding: 'ceil_per_km_after_radius' },
    origin: station,
    destination: { lat: dest.lat, lng: dest.lng, address: target?.address || null },
    method,
  };
};

module.exports = {
  STATIONS,
  normalizeCity,
  listStationsByCity,
  quoteDelivery,
  isValidLatLng,
  computeFeeFromDistanceKm,
};

