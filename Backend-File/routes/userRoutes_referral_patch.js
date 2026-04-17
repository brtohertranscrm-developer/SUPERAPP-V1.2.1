// ============================================================
// PATCH userRoutes.js — Milestone 2 Referral
// ============================================================
// Tambahkan helper ini di BAGIAN ATAS file userRoutes.js
// (setelah require-require yang ada):
//
//   const REFERRAL_CONFIG = require('../utils/referralConfig');
//
// Lalu tambahkan fungsi triggerFirstBookingMilestone() di bawah
// helper dbRun yang sudah ada.
//
// Terakhir, PANGGIL fungsinya di:
//   - router.post('/bookings', ...) → saat status booking dibuat 'active'
//   Atau lebih baik di:
//   - router.put('/bookings/:orderId/status', ...) di adminRoutes.js
//     → saat status berubah ke 'completed'
//
// GUNAKAN PATCH INI: tempel ke adminRoutes.js di fungsi
// PUT /bookings/:orderId/status, tepat setelah award miles existing.
// ============================================================

// Tambahkan baris ini di bagian atas adminRoutes.js:
// const REFERRAL_CONFIG = require('../utils/referralConfig');

/**
 * Trigger Milestone 2 Referral
 * Dipanggil ketika status booking berubah menjadi 'completed' / 'selesai'
 * Cek apakah user ini adalah referee yang belum dapat bonus first_booking.
 */
const triggerFirstBookingMilestone = async (db, userId) => {
  const dbGet = (sql, params = []) => new Promise((resolve, reject) =>
    db.get(sql, params, (err, row) => err ? reject(err) : resolve(row))
  );
  const dbRun = (sql, params = []) => new Promise((resolve, reject) =>
    db.run(sql, params, function(err) { err ? reject(err) : resolve({ lastID: this.lastID, changes: this.changes }); })
  );

  try {
    // Cari log referral: apakah user ini pernah didaftarkan oleh seseorang
    // dan belum menerima bonus first_booking
    const log = await dbGet(`
      SELECT id, referrer_id, status, miles_referee
      FROM referral_logs
      WHERE referee_id = ? AND status = ?
    `, [userId, 'registered']); // hanya yang masih 'registered', belum 'first_booking'

    if (!log) return; // bukan referee, atau sudah pernah dapat bonus first_booking

    // Cek apakah ini memang booking PERTAMA user ini yang selesai
    const completedCount = await dbGet(`
      SELECT COUNT(*) as count
      FROM bookings
      WHERE user_id = ? AND status IN ('completed', 'selesai')
    `, [userId]);

    // Jika ini bukan yang pertama, skip
    if ((completedCount?.count || 0) > 1) return;

    const bonusReferee   = REFERRAL_CONFIG.REFEREE_MILES_ON_FIRST_BOOKING; // +75 miles
    const now = new Date().toISOString();

    // 1. Beri +75 miles ke REFEREE
    await dbRun(
      `UPDATE users SET miles = miles + ? WHERE id = ?`,
      [bonusReferee, userId]
    );

    // 2. Update log referral → status: first_booking
    await dbRun(`
      UPDATE referral_logs
      SET status = ?,
          miles_referee = miles_referee + ?,
          first_booking_at = ?
      WHERE id = ?
    `, [REFERRAL_CONFIG.STATUS.FIRST_BOOKING, bonusReferee, now, log.id]);

    console.log(`🎯 Referral milestone 2 (first_booking): Referee ${userId} +${bonusReferee} miles`);

  } catch (err) {
    // Jangan sampai error referral merusak proses update booking
    console.error('⚠️  triggerFirstBookingMilestone error:', err.message);
  }
};

// ============================================================
// PATCH untuk adminRoutes.js
// Di fungsi PUT /bookings/:orderId/status
// Cari bagian "Award miles jika status selesai" yang sudah ada
// dan TAMBAHKAN panggilan triggerFirstBookingMilestone() seperti ini:
// ============================================================
/*
    // Award miles jika status selesai (kode LAMA — tetap dipertahankan)
    const completedStatuses = ['completed', 'selesai'];
    if (completedStatuses.includes(status.toLowerCase())) {
      try {
        const booking = await dbGet(
          `SELECT user_id, total_price FROM bookings WHERE order_id = ?`,
          [req.params.orderId]
        );
        if (booking) {
          const earnedMiles = Math.floor(booking.total_price / 10000);
          if (earnedMiles > 0) {
            await dbRun(`UPDATE users SET miles = miles + ? WHERE id = ?`, [earnedMiles, booking.user_id]);
          }

          // [REFERRAL] TAMBAHAN BARU — trigger milestone 2
          await triggerFirstBookingMilestone(db, booking.user_id);
        }
      } catch (milesErr) {
        console.error('⚠️  Gagal menambahkan miles:', milesErr.message);
      }
    }
*/

// ============================================================
// EXPORT — untuk dipakai di adminRoutes.js
// ============================================================
module.exports = { triggerFirstBookingMilestone };
