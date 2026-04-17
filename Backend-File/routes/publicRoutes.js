const express = require('express');
const db = require('../db');
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
// ==========================================
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

    // Cek limit penggunaan (0 = unlimited)
    if (promo.usage_limit > 0 && promo.current_usage >= promo.usage_limit) {
      return res.status(400).json({ success: false, error: 'Kuota kode promo ini sudah habis.' });
    }

    res.json({
      success: true,
      data: {
        code: promo.code,
        discount_percent: promo.discount_percent,
        max_discount: promo.max_discount
      }
    });
  } catch (err) {
    console.error('POST /promotions/validate error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal memvalidasi kode promo.' });
  }
});

router.post('/promotions/increment', async (req, res) => {
  try {
    const { code } = req.body || {};

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

    // Double-check: cegah increment melebihi limit
    if (promo.usage_limit > 0 && promo.current_usage >= promo.usage_limit) {
      return res.status(400).json({ success: false, error: 'Kuota kode promo sudah habis.' });
    }

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

module.exports = router;