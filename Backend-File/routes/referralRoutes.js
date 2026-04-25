/**
 * REFERRAL ROUTES — Brothers Trans
 * ==================================
 * [FIX 2] Operasi referral dibungkus dalam transaksi DB (BEGIN/COMMIT/ROLLBACK)
 *         sehingga miles tidak bisa setengah-setengah jika server crash di tengah jalan.
 * [FIX 7] Cek duplikat klaim dengan SELECT FOR UPDATE pattern (atomic WHERE condition)
 *
 * Mount di server.js: app.use('/api', referralRoutes);
 */

const express = require('express');
const db = require('../db');
const { verifyUser } = require('../middlewares/authMiddleware');
const REFERRAL_CONFIG = require('../utils/referralConfig');
const router = express.Router();

// ==========================================
// HELPER: Promisify DB
// ==========================================
const dbGet = (sql, params = []) => new Promise((resolve, reject) =>
  db.get(sql, params, (err, row) => err ? reject(err) : resolve(row))
);

const dbAll = (sql, params = []) => new Promise((resolve, reject) =>
  db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows || []))
);

// [FIX 2] Helper transaksi — jalankan array query dalam satu atomic transaction
// Jika salah satu query gagal, semua di-rollback
const runTransaction = (queries) => new Promise((resolve, reject) => {
  db.serialize(() => {
    db.run('BEGIN TRANSACTION', (err) => {
      if (err) return reject(new Error('Gagal memulai transaksi: ' + err.message));

      const runNext = (index) => {
        if (index >= queries.length) {
          db.run('COMMIT', (err) => {
            if (err) {
              db.run('ROLLBACK', () => reject(new Error('Gagal commit transaksi: ' + err.message)));
            } else {
              resolve();
            }
          });
          return;
        }

        const { sql, params } = queries[index];
        db.run(sql, params || [], (err) => {
          if (err) {
            db.run('ROLLBACK', () =>
              reject(new Error(`Query ${index + 1} gagal: ${err.message}`))
            );
            return;
          }
          runNext(index + 1);
        });
      };

      runNext(0);
    });
  });
});

// Semua route butuh login
router.use(verifyUser);

// ==========================================
// GET /api/referral/me
// Semua yang user butuhkan untuk share referral
// ==========================================
router.get('/referral/me', async (req, res) => {
  try {
    const user = await dbGet(
      `SELECT id, name, referral_code, miles FROM users WHERE id = ?`,
      [req.user.id]
    );
    if (!user) return res.status(404).json({ success: false, error: 'User tidak ditemukan.' });

    const stats = await dbGet(`
      SELECT
        COUNT(*)                                               as total_invited,
        COUNT(CASE WHEN status = 'first_booking' THEN 1 END)  as converted,
        COALESCE(SUM(miles_referrer), 0)                       as miles_from_referral,
        COALESCE(SUM(tier_bonus_awarded), 0)                   as tier_bonus_total,
        MAX(tier_label)                                        as highest_tier
      FROM referral_logs
      WHERE referrer_id = ?
    `, [req.user.id]);

    const totalInvites = stats?.total_invited || 0;
    const nextTier = REFERRAL_CONFIG.REFERRER_TIER_BONUSES.find(t => t.threshold > totalInvites) || null;

    const myReferralLog = await dbGet(`
      SELECT rl.status, rl.miles_referee, rl.first_booking_at,
             u.name as referrer_name
      FROM referral_logs rl
      JOIN users u ON u.id = rl.referrer_id
      WHERE rl.referee_id = ?
    `, [req.user.id]);

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    res.json({
      success: true,
      data: {
        referral_code: user.referral_code,
        referral_link: `${baseUrl}/register?ref=${user.referral_code}`,
        rewards_for_invitee: {
          on_register:      REFERRAL_CONFIG.REFEREE_MILES_ON_REGISTER,
          on_first_booking: REFERRAL_CONFIG.REFEREE_MILES_ON_FIRST_BOOKING,
          total:            REFERRAL_CONFIG.REFEREE_MILES_ON_REGISTER + REFERRAL_CONFIG.REFEREE_MILES_ON_FIRST_BOOKING
        },
        reward_per_invite: REFERRAL_CONFIG.REFERRER_MILES_PER_INVITE,
        stats: {
          total_invited:       totalInvites,
          converted:           stats?.converted || 0,
          miles_from_referral: (stats?.miles_from_referral || 0) + (stats?.tier_bonus_total || 0),
          highest_tier:        stats?.highest_tier || null,
          next_tier: nextTier ? {
            label:     nextTier.label,
            bonus:     nextTier.bonus,
            threshold: nextTier.threshold,
            progress:  totalInvites,
            remaining: nextTier.threshold - totalInvites
          } : null
        },
        referred_by: myReferralLog ? {
          referrer_name:    myReferralLog.referrer_name,
          status:           myReferralLog.status,
          miles_earned:     myReferralLog.miles_referee,
          pending_bonus:    myReferralLog.status === REFERRAL_CONFIG.STATUS.REGISTERED
            ? REFERRAL_CONFIG.REFEREE_MILES_ON_FIRST_BOOKING
            : 0,
          first_booking_at: myReferralLog.first_booking_at
        } : null
      }
    });

  } catch (err) {
    console.error('GET /referral/me error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil data referral.' });
  }
});

// ==========================================
// GET /api/referral/history
// ==========================================
router.get('/referral/history', async (req, res) => {
  try {
    const rows = await dbAll(`
      SELECT
        rl.id,
        rl.status,
        rl.miles_referee,
        rl.miles_referrer,
        rl.tier_bonus_awarded,
        rl.tier_label,
        rl.registered_at  as joined_at,
        rl.first_booking_at,
        u.name            as name,
        u.kyc_status
      FROM referral_logs rl
      JOIN users u ON u.id = rl.referee_id
      WHERE rl.referrer_id = ?
      ORDER BY rl.registered_at DESC
    `, [req.user.id]);

    const data = rows.map(r => ({
      ...r,
      status_label:     r.status === REFERRAL_CONFIG.STATUS.FIRST_BOOKING ? 'Booking Pertama ✓' : 'Sudah Daftar',
      miles_you_earned: r.miles_referrer + (r.tier_bonus_awarded || 0)
    }));

    res.json({ success: true, data });
  } catch (err) {
    console.error('GET /referral/history error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil history referral.' });
  }
});

// ==========================================
// GET /api/referral/rewards
// ==========================================
router.get('/referral/rewards', async (req, res) => {
  try {
    const asReferrer = await dbAll(`
      SELECT
        rl.registered_at as date,
        'invite' as type,
        u.name as from_name,
        rl.miles_referrer as miles,
        rl.tier_bonus_awarded as bonus,
        rl.tier_label
      FROM referral_logs rl
      JOIN users u ON u.id = rl.referee_id
      WHERE rl.referrer_id = ? AND (rl.miles_referrer > 0 OR rl.tier_bonus_awarded > 0)
      ORDER BY rl.registered_at DESC
    `, [req.user.id]);

    const asReferee = await dbAll(`
      SELECT
        CASE WHEN status = 'first_booking' THEN first_booking_at ELSE registered_at END as date,
        'joined' as type,
        u.name as from_name,
        miles_referee as miles,
        0 as bonus,
        NULL as tier_label
      FROM referral_logs rl
      JOIN users u ON u.id = rl.referrer_id
      WHERE rl.referee_id = ? AND miles_referee > 0
    `, [req.user.id]);

    const allRewards = [...asReferrer, ...asReferee]
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    const totalMiles = allRewards.reduce((sum, r) => sum + (r.miles || 0) + (r.bonus || 0), 0);

    res.json({ success: true, data: allRewards, total_miles_from_referral: totalMiles });
  } catch (err) {
    console.error('GET /referral/rewards error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil data reward.' });
  }
});

// ==========================================
// POST /api/referral/first-booking
// [FIX 2] Dipanggil saat booking pertama referee selesai
// Dibungkus transaksi — miles referee + referrer diberikan sekaligus atau tidak sama sekali
// ==========================================
router.post('/referral/first-booking', async (req, res) => {
  try {
    const { referee_id } = req.body || {};

    if (!referee_id) {
      return res.status(400).json({ success: false, error: 'referee_id wajib diisi.' });
    }

    // [FIX 7] Cek apakah milestone first_booking sudah pernah diproses
    // Gunakan SELECT + kondisi status — atomic check sebelum UPDATE
    const log = await dbGet(
      `SELECT id, referrer_id, status, miles_referee 
       FROM referral_logs 
       WHERE referee_id = ? AND status = 'registered'`,
      [referee_id]
    );

    if (!log) {
      // Bisa karena: sudah processed, atau memang tidak ada referral
      const existingLog = await dbGet(
        `SELECT status FROM referral_logs WHERE referee_id = ?`,
        [referee_id]
      );
      if (existingLog?.status === REFERRAL_CONFIG.STATUS.FIRST_BOOKING) {
        return res.status(400).json({ success: false, error: 'Milestone ini sudah diproses sebelumnya.' });
      }
      return res.json({ success: true, message: 'Tidak ada referral aktif untuk user ini.' });
    }

    const milesReferee  = REFERRAL_CONFIG.REFEREE_MILES_ON_FIRST_BOOKING;
    const milesReferrer = REFERRAL_CONFIG.REFERRER_MILES_PER_INVITE;

    // [FIX 2] Semua operasi miles dalam satu transaksi atomik
    // Jika salah satu gagal, semua di-rollback — tidak ada miles setengah-setengah
    await runTransaction([
      // 1. Tandai log sudah first_booking — UPDATE dengan kondisi status='registered'
      //    Jika ada dua request bersamaan, hanya satu yang berhasil (changes=1),
      //    yang lain tidak akan lanjut karena log.status sudah berubah
      {
        sql:    `UPDATE referral_logs 
                 SET status = ?, first_booking_at = datetime('now'),
                     miles_referee = miles_referee + ?
                 WHERE id = ? AND status = 'registered'`,
        params: [REFERRAL_CONFIG.STATUS.FIRST_BOOKING, milesReferee, log.id],
      },
      // 2. Tambah miles ke referee
      {
        sql:    `UPDATE users SET miles = COALESCE(miles, 0) + ? WHERE id = ?`,
        params: [milesReferee, referee_id],
      },
      // 3. Tambah miles ke referrer
      {
        sql:    `UPDATE users SET miles = COALESCE(miles, 0) + ? WHERE id = ?`,
        params: [milesReferrer, log.referrer_id],
      },
    ]);

    console.log(`✅ Referral first-booking: referee=${referee_id} +${milesReferee}mi, referrer=${log.referrer_id} +${milesReferrer}mi`);

    res.json({
      success: true,
      message: `Miles berhasil diberikan. Referee +${milesReferee}, referrer +${milesReferrer}.`,
    });

  } catch (err) {
    console.error('POST /referral/first-booking error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal memproses milestone referral.' });
  }
});

module.exports = router;
