// Backend-File/routes/adminReferralRoutes.js
// Endpoints:
//   GET /api/admin/referral/stats
//   GET /api/admin/referral/leaderboard?limit=10
//   GET /api/admin/referral/logs?page=1&limit=10

const express = require('express');
const router  = express.Router();
const db      = require('../db');

// ─── Helper promises ──────────────────────────────────────────────────────────
const queryAll = (sql, params = []) =>
  new Promise((res, rej) =>
    db.all(sql, params, (err, rows) => (err ? rej(err) : res(rows || [])))
  );

const queryOne = (sql, params = []) =>
  new Promise((res, rej) =>
    db.get(sql, params, (err, row) => (err ? rej(err) : res(row || {})))
  );

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/referral/stats
// ─────────────────────────────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const { total_codes } = await queryOne(
      `SELECT COUNT(*) AS total_codes FROM users
       WHERE referral_code IS NOT NULL AND referral_code != ''`
    );

    const { total_usage } = await queryOne(
      `SELECT COUNT(*) AS total_usage FROM referral_logs`
    );

    const { total_converted } = await queryOne(
      `SELECT COUNT(*) AS total_converted FROM referral_logs
       WHERE first_booking_at IS NOT NULL`
    );

    const { total_miles_given } = await queryOne(
      `SELECT COALESCE(SUM(miles_referrer), 0) AS total_miles_given FROM referral_logs`
    );

    const { usage_this_month } = await queryOne(
      `SELECT COUNT(*) AS usage_this_month FROM referral_logs
       WHERE strftime('%Y-%m', registered_at) = strftime('%Y-%m', 'now')`
    );

    res.json({
      success: true,
      data: {
        total_codes:       total_codes       || 0,
        total_usage:       total_usage       || 0,
        total_converted:   total_converted   || 0,
        total_miles_given: total_miles_given || 0,
        usage_this_month:  usage_this_month  || 0,
      }
    });
  } catch (err) {
    console.error('[adminReferral] /stats error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/referral/leaderboard?limit=10
// ─────────────────────────────────────────────────────────────────────────────
router.get('/leaderboard', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 10, 50);

  try {
    const rows = await queryAll(
      `SELECT
         u.id            AS user_id,
         u.name          AS user_name,
         u.email         AS user_email,
         u.referral_code,
         u.miles,
         COUNT(rl.id)                        AS usage_count,
         COALESCE(SUM(rl.miles_referrer), 0) AS total_miles_earned,
         MAX(rl.registered_at)               AS last_referral_at
       FROM users u
       INNER JOIN referral_logs rl ON rl.referrer_id = u.id
       GROUP BY u.id
       ORDER BY usage_count DESC, total_miles_earned DESC
       LIMIT ?`,
      [limit]
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[adminReferral] /leaderboard error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/referral/logs?page=1&limit=10
// ─────────────────────────────────────────────────────────────────────────────
router.get('/logs', async (req, res) => {
  const page   = Math.max(parseInt(req.query.page)  || 1, 1);
  const limit  = Math.min(parseInt(req.query.limit) || 10, 100);
  const offset = (page - 1) * limit;

  try {
    const { total } = await queryOne(`SELECT COUNT(*) AS total FROM referral_logs`);

    const logs = await queryAll(
      `SELECT
         rl.id,
         rl.referrer_id,
         referrer.name        AS referrer_name,
         referrer.email       AS referrer_email,
         referrer.referral_code,
         rl.referee_id,
         referee.name         AS referee_name,
         referee.email        AS referee_email,
         rl.status,
         rl.miles_referee,
         rl.miles_referrer,
         rl.tier_bonus_awarded,
         rl.tier_label,
         rl.registered_at,
         rl.first_booking_at
       FROM referral_logs rl
       LEFT JOIN users referrer ON referrer.id = rl.referrer_id
       LEFT JOIN users referee  ON referee.id  = rl.referee_id
       ORDER BY rl.registered_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    res.json({
      success: true,
      data: logs,
      pagination: {
        page,
        limit,
        total:       total || 0,
        total_pages: Math.ceil((total || 0) / limit),
      }
    });
  } catch (err) {
    console.error('[adminReferral] /logs error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
