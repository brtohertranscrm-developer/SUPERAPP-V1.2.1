// ============================================================
// PATCH adminRoutes.js
// Tambahkan di BAWAH seksi "ARTIKEL MANAGEMENT"
// dan DI ATAS seksi "ADMIN & ROLE MANAGEMENT"
// ============================================================
//
// COPY bagian ini saja dan sisipkan ke adminRoutes.js yang sudah ada
// ============================================================

// ==========================================
// REFERRAL MANAGEMENT (Akses: users)
// ==========================================

// GET /api/admin/referral/stats — statistik global referral
router.get('/referral/stats', requirePermission('users'), async (req, res) => {
  try {
    const [totals, thisMonth, topReferrer] = await Promise.all([
      dbGet(`
        SELECT
          COUNT(*) as total_referrals,
          SUM(miles_referrer) as total_miles_referrer,
          SUM(miles_referee)  as total_miles_referee,
          SUM(tier_bonus_awarded) as total_tier_bonus,
          COUNT(DISTINCT referrer_id) as unique_referrers,
          COUNT(CASE WHEN status = 'first_booking' THEN 1 END) as converted
        FROM referral_logs
      `),
      dbGet(`
        SELECT COUNT(*) as count
        FROM referral_logs
        WHERE strftime('%Y-%m', registered_at) = strftime('%Y-%m', 'now')
      `),
      dbGet(`
        SELECT u.name, u.referral_code, COUNT(*) as total_invite,
               SUM(rl.miles_referrer) as total_miles_earned
        FROM referral_logs rl
        JOIN users u ON u.id = rl.referrer_id
        GROUP BY rl.referrer_id
        ORDER BY total_invite DESC
        LIMIT 1
      `)
    ]);

    res.json({
      success: true,
      data: {
        total_referrals:        totals?.total_referrals || 0,
        unique_referrers:       totals?.unique_referrers || 0,
        converted_to_booking:   totals?.converted || 0,
        conversion_rate:        totals?.total_referrals > 0
          ? Math.round((totals.converted / totals.total_referrals) * 100)
          : 0,
        total_miles_distributed: (totals?.total_miles_referrer || 0)
          + (totals?.total_miles_referee || 0)
          + (totals?.total_tier_bonus || 0),
        referrals_this_month:   thisMonth?.count || 0,
        top_referrer:           topReferrer || null
      }
    });
  } catch (err) {
    console.error('GET /admin/referral/stats error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil statistik referral.' });
  }
});

// GET /api/admin/referral/leaderboard?limit=10 — top referrers
router.get('/referral/leaderboard', requirePermission('users'), async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);

    const rows = await dbAll(`
      SELECT
        u.id, u.name, u.email, u.referral_code, u.miles,
        COUNT(rl.id)                  as total_invite,
        SUM(rl.miles_referrer)        as miles_from_referral,
        SUM(rl.tier_bonus_awarded)    as tier_bonus_total,
        MAX(rl.tier_label)            as highest_tier,
        COUNT(CASE WHEN rl.status = 'first_booking' THEN 1 END) as converted,
        MAX(rl.registered_at)         as last_invite_at
      FROM referral_logs rl
      JOIN users u ON u.id = rl.referrer_id
      GROUP BY rl.referrer_id
      ORDER BY total_invite DESC, miles_from_referral DESC
      LIMIT ?
    `, [limit]);

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /admin/referral/leaderboard error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil leaderboard.' });
  }
});

// GET /api/admin/referral/logs?referrer_id=&date_from=&date_to=&status=&page=1&limit=20
router.get('/referral/logs', requirePermission('users'), async (req, res) => {
  try {
    const { referrer_id, date_from, date_to, status, page = 1, limit = 20 } = req.query;
    const conditions = [];
    const params = [];

    if (referrer_id) { conditions.push('rl.referrer_id = ?'); params.push(referrer_id); }
    if (status)      { conditions.push('rl.status = ?');      params.push(status); }
    if (date_from)   { conditions.push("date(rl.registered_at) >= date(?)"); params.push(date_from); }
    if (date_to)     { conditions.push("date(rl.registered_at) <= date(?)"); params.push(date_to); }

    const where  = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const [rows, countRow] = await Promise.all([
      dbAll(`
        SELECT
          rl.id, rl.status, rl.registered_at, rl.first_booking_at,
          rl.miles_referee, rl.miles_referrer,
          rl.tier_bonus_awarded, rl.tier_label,
          referrer.name  as referrer_name,
          referrer.email as referrer_email,
          referrer.referral_code,
          referee.name   as referee_name,
          referee.email  as referee_email,
          referee.kyc_status
        FROM referral_logs rl
        JOIN users referrer ON referrer.id = rl.referrer_id
        JOIN users referee  ON referee.id  = rl.referee_id
        ${where}
        ORDER BY rl.registered_at DESC
        LIMIT ? OFFSET ?
      `, [...params, parseInt(limit), offset]),
      dbGet(`SELECT COUNT(*) as total FROM referral_logs rl ${where}`, params)
    ]);

    res.json({
      success: true,
      data: rows,
      pagination: {
        total:       countRow?.total || 0,
        page:        parseInt(page),
        limit:       parseInt(limit),
        total_pages: Math.ceil((countRow?.total || 0) / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('GET /admin/referral/logs error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil log referral.' });
  }
});
