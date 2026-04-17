/**
 * REFERRAL ROUTES — Brothers Trans
 * ==================================
 * Endpoint khusus sistem referral untuk user.
 * Admin referral endpoints ada di adminRoutes.js (patch).
 *
 * Mount di server.js: app.use('/api', referralRoutes);
 *
 * Endpoints:
 *   GET  /api/referral/me          — info kode + link + statistik user
 *   GET  /api/referral/history     — daftar orang yang pernah diajak
 *   GET  /api/referral/rewards     — rincian reward yang pernah diterima
 */

const express = require('express');
const db = require('../db');
const { verifyUser } = require('../middlewares/authMiddleware');
const REFERRAL_CONFIG = require('../utils/referralConfig');
const router = express.Router();

const dbGet = (sql, params = []) => new Promise((resolve, reject) =>
  db.get(sql, params, (err, row) => err ? reject(err) : resolve(row))
);
const dbAll = (sql, params = []) => new Promise((resolve, reject) =>
  db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows || []))
);

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

    // Statistik referral milik user ini
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

    // Tier berikutnya yang bisa dicapai
    const totalInvites = stats?.total_invited || 0;
    const nextTier = REFERRAL_CONFIG.REFERRER_TIER_BONUSES.find(t => t.threshold > totalInvites) || null;

    // Info referral yang diterima user ini (jika dia pernah didaftarkan oleh orang lain)
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
        // Reward yang akan diterima orang yang diajak
        rewards_for_invitee: {
          on_register:     REFERRAL_CONFIG.REFEREE_MILES_ON_REGISTER,
          on_first_booking: REFERRAL_CONFIG.REFEREE_MILES_ON_FIRST_BOOKING,
          total:           REFERRAL_CONFIG.REFEREE_MILES_ON_REGISTER + REFERRAL_CONFIG.REFEREE_MILES_ON_FIRST_BOOKING
        },
        // Reward untuk user ini per invite
        reward_per_invite: REFERRAL_CONFIG.REFERRER_MILES_PER_INVITE,
        // Statistik invite yang sudah dilakukan
        stats: {
          total_invited:       stats?.total_invited || 0,
          converted:           stats?.converted || 0,
          miles_from_referral: (stats?.miles_from_referral || 0) + (stats?.tier_bonus_total || 0),
          highest_tier:        stats?.highest_tier || null,
          // Progress menuju tier berikutnya
          next_tier: nextTier ? {
            label:     nextTier.label,
            bonus:     nextTier.bonus,
            threshold: nextTier.threshold,
            progress:  totalInvites,
            remaining: nextTier.threshold - totalInvites
          } : null
        },
        // Info jika user ini didaftarkan oleh seseorang
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
// Daftar orang yang sudah diajak + statusnya
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

    // Tambah label yang user-friendly
    const data = rows.map(r => ({
      ...r,
      status_label: r.status === REFERRAL_CONFIG.STATUS.FIRST_BOOKING
        ? 'Booking Pertama ✓'
        : 'Sudah Daftar',
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
// Breakdown reward yang pernah diterima dari referral
// ==========================================
router.get('/referral/rewards', async (req, res) => {
  try {
    // Reward dari mengajak orang lain (sebagai referrer)
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

    // Reward dari diajak orang lain (sebagai referee)
    const asReferee = await dbAll(`
      SELECT
        CASE
          WHEN status = 'first_booking' THEN first_booking_at
          ELSE registered_at
        END as date,
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

    res.json({
      success: true,
      data: allRewards,
      total_miles_from_referral: totalMiles
    });
  } catch (err) {
    console.error('GET /referral/rewards error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil data reward.' });
  }
});

module.exports = router;
