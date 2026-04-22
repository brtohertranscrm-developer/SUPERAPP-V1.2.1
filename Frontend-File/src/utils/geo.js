// Minimal helpers for parsing a Google Maps link or raw "lat,lng" input.

export const parseLatLngFromText = (raw = '') => {
  const text = String(raw || '').trim();
  if (!text) return null;

  // 1) Plain "lat,lng"
  const plain = text.match(/(-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/);
  if (plain) {
    const lat = Number(plain[1]);
    const lng = Number(plain[2]);
    if (isValidLatLng(lat, lng)) return { lat, lng };
  }

  // 2) Google Maps pattern: ".../@lat,lng,..." or "...?q=lat,lng"
  const at = text.match(/@(-?\d{1,3}\.\d+),\s*(-?\d{1,3}\.\d+)/);
  if (at) {
    const lat = Number(at[1]);
    const lng = Number(at[2]);
    if (isValidLatLng(lat, lng)) return { lat, lng };
  }

  const q = text.match(/[?&]q=(-?\d{1,3}\.\d+)%2C(-?\d{1,3}\.\d+)/i);
  if (q) {
    const lat = Number(q[1]);
    const lng = Number(q[2]);
    if (isValidLatLng(lat, lng)) return { lat, lng };
  }

  return null;
};

export const isValidLatLng = (lat, lng) => {
  const a = Number(lat);
  const b = Number(lng);
  return Number.isFinite(a) && Number.isFinite(b) && a >= -90 && a <= 90 && b >= -180 && b <= 180;
};

