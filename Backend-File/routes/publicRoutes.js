const express = require('express');
const db = require('../db');
const { calculateMotorRentalBreakdown } = require('../utils/motorRentalPricing');
const { listStationsByCity, quoteDelivery } = require('../utils/deliveryPricing');
const router = express.Router();

// ==========================================
// HELPER: Promisify db methods untuk kode lebih bersih
// ==========================================
const dbGet = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
});

const dbAll = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows || []));
});

// ==========================================
// HELPER: Hitung markup pricing (Surge + Seasonal)
// ==========================================
const calculateActiveMarkup = async () => {
  let totalMarkup = 0;
  let surgeActive = false;
  let seasonalName = null;

  // 1. Cek Surge Pricing
  const surgeRule = await dbGet(
    `SELECT markup_percentage, stock_condition FROM price_rules WHERE rule_type = 'surge' AND is_active = 1`
  );
  if (surgeRule) {
    totalMarkup += surgeRule.markup_percentage;
    surgeActive = true;
  }

  // 2. Cek Seasonal Pricing (berdasarkan tanggal hari ini)
  const today = new Date().toISOString().split('T')[0];
  const seasonalRule = await dbGet(
    `SELECT name, markup_percentage FROM price_rules WHERE rule_type = 'seasonal' AND start_date <= ? AND end_date >= ?`,
    [today, today]
  );
  if (seasonalRule) {
    totalMarkup += seasonalRule.markup_percentage;
    seasonalName = seasonalRule.name;
  }

  return { totalMarkup, surgeActive, seasonalName };
};

// ==========================================
// MOTORS - Daftar Motor + Dynamic Pricing
// ==========================================
router.get('/motors', async (req, res) => {
  try {
    const { totalMarkup, surgeActive, seasonalName } = await calculateActiveMarkup();

    const motors = await dbAll(`
      SELECT m.*, 
             (SELECT COUNT(*) FROM motor_units mu WHERE mu.motor_id = m.id AND mu.status = 'RDY') as stock
      FROM motors m 
      ORDER BY m.base_price ASC
    `);

    const formattedMotors = motors.map(motor => {
      let currentPrice = motor.base_price;
      let currentPrice12h = motor.price_12h || 0;
      let isSurge = false;

      // Cek whitelist: apakah motor ini boleh kena dynamic pricing
      const isDynamicAllowed = motor.allow_dynamic_pricing === undefined 
        || motor.allow_dynamic_pricing === null 
        || parseInt(motor.allow_dynamic_pricing) === 1;

      if (isDynamicAllowed && totalMarkup > 0) {
        currentPrice = Math.round(motor.base_price * (1 + totalMarkup / 100));
        currentPrice12h = Math.round(currentPrice12h * (1 + totalMarkup / 100));
        isSurge = true;
      }

      return {
        ...motor,
        current_price: currentPrice,
        current_price_12h: currentPrice12h,
        is_surge: isSurge,
        surge_info: isSurge ? { surgeActive, seasonalName } : null
      };
    });

    res.json({ success: true, data: formattedMotors });
  } catch (err) {
    console.error('GET /motors error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil data motor.' });
  }
});

// ==========================================
// PRICING SETTINGS (Public)
// ==========================================
router.get('/pricing/motor-billing', async (req, res) => {
  try {
    const row = await dbGet(
      `SELECT motor_billing_mode, motor_threshold_12h, updated_at
       FROM booking_pricing_settings WHERE id = 1`
    );

    res.json({
      success: true,
      data: {
        motor_billing_mode: row?.motor_billing_mode || 'calendar',
        motor_threshold_12h: Number(row?.motor_threshold_12h) || 12,
        updated_at: row?.updated_at || null,
      },
    });
  } catch (err) {
    console.error('GET /pricing/motor-billing error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil pengaturan billing.' });
  }
});

// ==========================================
// PRICING PREVIEW: MOTOR BREAKDOWN (Public)
// Source of truth: backend helper + DB settings
// ==========================================
router.post('/pricing/motor-breakdown', async (req, res) => {
  try {
    const {
      startDate,
      startTime,
      endDate,
      endTime,
      price24h,
      price12h,
    } = req.body || {};

    const settings = await dbGet(
      `SELECT motor_billing_mode, motor_threshold_12h
       FROM booking_pricing_settings WHERE id = 1`
    );

    const breakdown = calculateMotorRentalBreakdown({
      startDate,
      startTime,
      endDate,
      endTime,
      price24h,
      price12h,
      billingMode: settings?.motor_billing_mode || 'calendar',
      threshold12h: settings?.motor_threshold_12h || 12,
    });

    if (!breakdown.isValid) {
      return res.status(400).json({ success: false, error: breakdown.error || 'Data booking tidak valid.' });
    }

    res.json({
      success: true,
      data: {
        ...breakdown,
        // Normalize Dates for frontend
        startAtIso: breakdown.startAt instanceof Date ? breakdown.startAt.toISOString() : breakdown.startAt,
        endAtIso: breakdown.endAt instanceof Date ? breakdown.endAt.toISOString() : breakdown.endAt,
      },
    });
  } catch (err) {
    console.error('POST /pricing/motor-breakdown error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal menghitung billing motor.' });
  }
});

// ==========================================
// LOCKERS - Daftar Loker
// ==========================================
router.get('/lockers', async (req, res) => {
  try {
    const rows = await dbAll('SELECT * FROM lockers ORDER BY location ASC');
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /lockers error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil data loker.' });
  }
});

// ==========================================
// PROMOTIONS - Daftar Promo Aktif
// ==========================================
router.get('/promotions', async (req, res) => {
  try {
    const rows = await dbAll('SELECT * FROM promotions WHERE is_active = 1');
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /promotions error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil data promosi.' });
  }
});

// ==========================================
// DELIVERY QUOTE (Public)
// ==========================================
router.get('/delivery/stations', async (req, res) => {
  try {
    const city = req.query.city || '';
    const rows = listStationsByCity(city).map((s) => ({
      id: s.id,
      city: s.city,
      name: s.name,
      lat: s.lat,
      lng: s.lng,
      is_free: !!s.is_free,
    }));
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /delivery/stations error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil data titik pengantaran.' });
  }
});

router.post('/delivery/quote', async (req, res) => {
  try {
    const { city, target } = req.body || {};
    const q = await quoteDelivery({ city, target });
    if (!q.ok) return res.status(400).json({ success: false, error: q.error || 'Gagal menghitung ongkir.' });

    res.json({
      success: true,
      data: {
        fee: q.fee,
        distance_km: q.distance_km,
        currency: q.currency,
        pricing: q.pricing,
        origin: q.origin,
        destination: q.destination,
        method: q.method,
      },
    });
  } catch (err) {
    console.error('POST /delivery/quote error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal menghitung biaya pengantaran.' });
  }
});

// ==========================================
// ARTICLES - Daftar & Detail Artikel Published
// ==========================================
router.get('/articles', async (req, res) => {
  try {
    const rows = await dbAll(
      `SELECT id, title, slug, category, image_url, meta_desc, created_at, views 
       FROM articles WHERE status = 'published' ORDER BY created_at DESC`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /articles error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil data artikel.' });
  }
});

router.get('/articles/:id', async (req, res) => {
  try {
    const articleId = req.params.id;
    const row = await dbGet('SELECT * FROM articles WHERE id = ?', [articleId]);

    if (!row) {
      return res.status(404).json({ success: false, error: 'Artikel tidak ditemukan.' });
    }

    // Increment view count (fire-and-forget, tidak perlu ditunggu)
    db.run('UPDATE articles SET views = views + 1 WHERE id = ?', [articleId]);

    res.json({ success: true, data: row });
  } catch (err) {
    console.error('GET /articles/:id error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil detail artikel.' });
  }
});

// ==========================================
// PROMO VALIDATION & TRACKING
// [FIX P3] Cek duplikat pemakaian promo per user
// Satu kode promo hanya bisa dipakai 1x per user
// Tabel promo_usage dibuat di db.js
// ==========================================

// POST /api/promotions/validate
// Butuh token agar bisa cek duplikat per user — baca user_id dari JWT jika ada
router.post('/promotions/validate', async (req, res) => {
  try {
    const { code } = req.body || {};

    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Kode promo wajib diisi.' });
    }

    const promo = await dbGet(
      `SELECT * FROM promotions WHERE code = ? AND is_active = 1`,
      [code.trim().toUpperCase()]
    );

    if (!promo) {
      return res.status(404).json({ success: false, error: 'Kode promo tidak ditemukan atau sudah tidak aktif.' });
    }

    // Cek limit penggunaan global (0 = unlimited)
    if (promo.usage_limit > 0 && promo.current_usage >= promo.usage_limit) {
      return res.status(400).json({ success: false, error: 'Kuota kode promo ini sudah habis.' });
    }

    // [FIX P3] Cek duplikat per user — ambil user_id dari JWT jika ada
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const alreadyUsed = await dbGet(
          `SELECT id FROM promo_usage WHERE promo_id = ? AND user_id = ?`,
          [promo.id, decoded.id]
        );
        if (alreadyUsed) {
          return res.status(400).json({
            success: false,
            error: 'Kode promo ini sudah pernah kamu gunakan sebelumnya.',
          });
        }
      } catch {
        // Token invalid/expired — lanjut tanpa cek per-user
      }
    }

    res.json({
      success: true,
      data: {
        id:               promo.id,
        code:             promo.code,
        discount_percent: promo.discount_percent,
        max_discount:     promo.max_discount,
      },
    });
  } catch (err) {
    console.error('POST /promotions/validate error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal memvalidasi kode promo.' });
  }
});

// POST /api/promotions/increment
// Dipanggil setelah booking berhasil — catat usage per user + increment global counter
router.post('/promotions/increment', async (req, res) => {
  try {
    const { code, order_id } = req.body || {};

    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Kode promo wajib diisi.' });
    }

    const promo = await dbGet(
      `SELECT id, usage_limit, current_usage FROM promotions WHERE code = ?`,
      [code.trim().toUpperCase()]
    );

    if (!promo) {
      return res.status(404).json({ success: false, error: 'Kode promo tidak ditemukan.' });
    }

    // Double-check limit global
    if (promo.usage_limit > 0 && promo.current_usage >= promo.usage_limit) {
      return res.status(400).json({ success: false, error: 'Kuota kode promo sudah habis.' });
    }

    // [FIX P3] Ambil user_id dari JWT untuk catat usage per user
    let userId = null;
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.id;
      } catch { /* skip */ }
    }

    // [FIX P3] INSERT OR IGNORE — jika sudah ada, tidak error tapi juga tidak dobel
    if (userId) {
      await new Promise((resolve) => {
        db.run(
          `INSERT OR IGNORE INTO promo_usage (promo_id, user_id, order_id) VALUES (?, ?, ?)`,
          [promo.id, userId, order_id || null],
          () => resolve()
        );
      });
    }

    // Increment global counter
    db.run(
      `UPDATE promotions SET current_usage = current_usage + 1 WHERE id = ?`,
      [promo.id]
    );

    res.json({ success: true, message: 'Penggunaan promo berhasil dicatat.' });
  } catch (err) {
    console.error('POST /promotions/increment error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mencatat penggunaan promo.' });
  }
});

router.get('/payment-info', (req, res) => {
  res.json({
    success: true,
    data: {
      bca:     { bank: 'BCA',     number: process.env.PAYMENT_BCA_NUMBER     || '', name: process.env.PAYMENT_BCA_NAME     || '' },
      mandiri: { bank: 'Mandiri', number: process.env.PAYMENT_MANDIRI_NUMBER || '', name: process.env.PAYMENT_MANDIRI_NAME || '' },
      qris:    { bank: 'QRIS',    number: '', name: process.env.PAYMENT_QRIS_INFO || 'GoPay, OVO, Dana, ShopeePay' },
    },
  });
});

module.exports = router;
