/**
 * REFERRAL CONFIG — Brothers Trans
 * ==================================
 * Satu sumber kebenaran untuk semua konstanta sistem referral.
 * Import file ini di authRoutes, userRoutes, referralRoutes, adminRoutes.
 *
 * Skema reward:
 *   REFEREE (yang diajak):
 *     - +25 miles saat register pakai kode referral   → status: 'registered'
 *     - +75 miles saat booking pertama selesai        → status: 'first_booking'
 *
 *   REFERRER (yang mengajak):
 *     - +100 miles per invite yang berhasil KYC
 *     - Tiered bonus otomatis:
 *       ≥  5 invite → +200 bonus miles (satu kali)
 *       ≥ 10 invite → +500 bonus miles (satu kali)
 *       ≥ 25 invite → +1500 bonus miles (satu kali)
 */

const REFERRAL_CONFIG = {
  // Reward untuk REFEREE (yang baru daftar)
  REFEREE_MILES_ON_REGISTER:      25,   // langsung saat register
  REFEREE_MILES_ON_FIRST_BOOKING: 75,   // saat booking pertama selesai

  // Reward untuk REFERRER (yang mengajak)
  REFERRER_MILES_PER_INVITE: 100,       // per orang berhasil diajak (status: registered)

  // Tiered bonus referrer — diberikan satu kali saat milestone tercapai
  // Urut dari kecil ke besar agar bisa di-loop
  REFERRER_TIER_BONUSES: [
    { threshold: 5,  bonus: 200,  label: 'Silver Referrer' },
    { threshold: 10, bonus: 500,  label: 'Gold Referrer'   },
    { threshold: 25, bonus: 1500, label: 'Diamond Referrer' },
  ],

  // Status milestone di referral_logs
  STATUS: {
    REGISTERED:    'registered',     // referee sudah register, miles awal sudah diberikan
    FIRST_BOOKING: 'first_booking',  // referee sudah booking pertama, bonus sudah diberikan
  }
};

module.exports = REFERRAL_CONFIG;
