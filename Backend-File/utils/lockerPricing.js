/**
 * HELPER — Kalkulasi Harga Loker Brothers Trans
 * =============================================
 * Pricing tiers per type:
 *   Terbuka  → 1h: 5.000 | 12h: 35.000 | 24h: 50.000
 *   Tertutup → 1h: 7.000 | 12h: 45.000 | 24h: 65.000
 *
 * Algoritma greedy: ambil paket terbesar dulu (24h → 12h → per jam)
 * untuk dapat harga paling murah secara otomatis.
 */

const MIN_HOURS = 3;

/**
 * Hitung total harga loker berdasarkan durasi jam
 * @param {number} hours         - Durasi dalam jam (minimal 3)
 * @param {number} price_1h      - Harga per jam
 * @param {number} price_12h     - Harga paket 12 jam
 * @param {number} price_24h     - Harga paket 24 jam
 * @returns {{ total: number, breakdown: object, isValid: boolean, error?: string }}
 */
const calculateLockerPrice = (hours, price_1h, price_12h, price_24h) => {
  const h = parseInt(hours);

  if (!h || h < MIN_HOURS) {
    return {
      isValid: false,
      error: `Minimal pemesanan adalah ${MIN_HOURS} jam.`,
      total: 0
    };
  }

  let remaining = h;
  let total = 0;

  const packs24 = Math.floor(remaining / 24);
  remaining -= packs24 * 24;
  total += packs24 * price_24h;

  const packs12 = Math.floor(remaining / 12);
  remaining -= packs12 * 12;
  total += packs12 * price_12h;

  total += remaining * price_1h;

  return {
    isValid: true,
    total,
    breakdown: {
      packs_24h: packs24,
      packs_12h: packs12,
      remaining_hours: remaining,
      cost_24h: packs24 * price_24h,
      cost_12h: packs12 * price_12h,
      cost_hourly: remaining * price_1h
    }
  };
};

/**
 * Default pricing per type (sesuai ketentuan Brothers Trans)
 */
const DEFAULT_PRICING = {
  terbuka: {
    price_1h: 5000,
    price_12h: 35000,
    price_24h: 50000,
    dimensions: '50x100x40'
  },
  tertutup: {
    price_1h: 7000,
    price_12h: 45000,
    price_24h: 65000,
    dimensions: '90x60x50'
  }
};

module.exports = { calculateLockerPrice, DEFAULT_PRICING, MIN_HOURS };
