/**
 * PUBLIC LOKER ROUTES — Brothers Trans
 * =====================================
 * Tidak butuh auth untuk GET katalog & kalkulasi harga.
 * Checkout butuh verifyToken.
 *
 * Mount di server.js: app.use('/api/loker', lokerPublicRoutes)
 *
 * Endpoint:
 *   GET  /catalog                    — list loker by location + type
 *   GET  /addons                     — list addon aktif (pickup/drop)
 *   POST /calculate                  — hitung harga berdasarkan durasi + addon
 *   POST /checkout                   — buat booking loker (butuh auth)
 */

const express = require('express');
const { v4: uuidv4 } = require('crypto');
const db = require('../db');
const { calculateLockerPrice, MIN_HOURS } = require('../utils/lockerPricing');
const router = express.Router();

const dbGet = (sql, params = []) => new Promise((resolve, reject) =>
  db.get(sql, params, (err, row) => err ? reject(err) : resolve(row))
);
const dbAll = (sql, params = []) => new Promise((resolve, reject) =>
  db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows || []))
);
const dbRun = (sql, params = []) => new Promise((resolve, reject) =>
  db.run(sql, params, function(err) { err ? reject(err) : resolve({ lastID: this.lastID, changes: this.changes }); })
);

// ==========================================
// KATALOG LOKER
// ==========================================

router.get('/catalog', async (req, res) => {
  try {
    const { location, type } = req.query;
    const conditions = ['stock > 0'];
    const params = [];

    if (location) { conditions.push('location = ?'); params.push(location); }
    if (type && ['terbuka', 'tertutup'].includes(type)) {
      conditions.push('type = ?'); params.push(type);
    }

    const rows = await dbAll(
      `SELECT id, location, type, stock, price_1h, price_12h, price_24h, dimensions
       FROM lockers
       WHERE ${conditions.join(' AND ')}
       ORDER BY type ASC, location ASC`,
      params
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /loker/catalog error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil katalog loker.' });
  }
});

// ==========================================
// ADDON LIST (Pickup & Drop)
// ==========================================

router.get('/addons', async (req, res) => {
  try {
    const rows = await dbAll(
      `SELECT id, name, description, price, addon_type FROM locker_addons WHERE is_active = 1 ORDER BY addon_type`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /loker/addons error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil data addon.' });
  }
});

// ==========================================
// KALKULASI HARGA
// ==========================================

router.post('/calculate', async (req, res) => {
  try {
    const {
      locker_id,
      duration_hours,
      pickup_addon_id,
      drop_addon_id
    } = req.body || {};

    if (!locker_id || !duration_hours) {
      return res.status(400).json({ success: false, error: 'Loker ID dan durasi wajib diisi.' });
    }

    const locker = await dbGet(
      `SELECT id, type, price_1h, price_12h, price_24h, stock FROM lockers WHERE id = ? AND stock > 0`,
      [locker_id]
    );
    if (!locker) {
      return res.status(404).json({ success: false, error: 'Loker tidak tersedia.' });
    }

    // Hitung harga sewa loker
    const pricing = calculateLockerPrice(
      duration_hours,
      locker.price_1h,
      locker.price_12h,
      locker.price_24h
    );
    if (!pricing.isValid) {
      return res.status(400).json({ success: false, error: pricing.error });
    }

    let pickupFee = 0;
    let dropFee = 0;

    // Ambil harga addon jika dipilih
    if (pickup_addon_id) {
      const addon = await dbGet(
        `SELECT price FROM locker_addons WHERE id = ? AND is_active = 1 AND addon_type = 'pickup'`,
        [pickup_addon_id]
      );
      if (addon) pickupFee = addon.price;
    }
    if (drop_addon_id) {
      const addon = await dbGet(
        `SELECT price FROM locker_addons WHERE id = ? AND is_active = 1 AND addon_type = 'drop'`,
        [drop_addon_id]
      );
      if (addon) dropFee = addon.price;
    }

    const total = pricing.total + pickupFee + dropFee;

    res.json({
      success: true,
      data: {
        locker_type: locker.type,
        duration_hours: parseInt(duration_hours),
        locker_cost: pricing.total,
        pickup_fee: pickupFee,
        drop_fee: dropFee,
        total_price: total,
        breakdown: pricing.breakdown
      }
    });
  } catch (err) {
    console.error('POST /loker/calculate error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal menghitung harga.' });
  }
});

// ==========================================
// CHECKOUT LOKER (butuh auth)
// ==========================================

router.post('/checkout', async (req, res) => {
  // Middleware auth dipasang di server.js untuk route ini
  // req.user sudah tersedia dari verifyToken
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Login terlebih dahulu.' });

    const {
      locker_id,
      duration_hours,
      start_date,
      pickup_addon_id,
      drop_addon_id,
      renter_name,
      renter_phone,
      payment_method = 'transfer'
    } = req.body || {};

    if (!locker_id || !duration_hours || !start_date) {
      return res.status(400).json({
        success: false,
        error: 'Loker, durasi, dan tanggal mulai wajib diisi.'
      });
    }

    const h = parseInt(duration_hours);
    if (h < MIN_HOURS) {
      return res.status(400).json({
        success: false,
        error: `Minimal pemesanan adalah ${MIN_HOURS} jam.`
      });
    }

    // Cek ketersediaan loker
    const locker = await dbGet(
      `SELECT * FROM lockers WHERE id = ? AND stock > 0`,
      [locker_id]
    );
    if (!locker) {
      return res.status(404).json({ success: false, error: 'Loker tidak tersedia atau stok habis.' });
    }

    // Hitung harga
    const pricing = calculateLockerPrice(h, locker.price_1h, locker.price_12h, locker.price_24h);
    if (!pricing.isValid) return res.status(400).json({ success: false, error: pricing.error });

    let pickupFee = 0;
    let dropFee = 0;

    if (pickup_addon_id) {
      const addon = await dbGet(
        `SELECT price FROM locker_addons WHERE id = ? AND is_active = 1 AND addon_type = 'pickup'`,
        [pickup_addon_id]
      );
      if (addon) pickupFee = addon.price;
    }
    if (drop_addon_id) {
      const addon = await dbGet(
        `SELECT price FROM locker_addons WHERE id = ? AND is_active = 1 AND addon_type = 'drop'`,
        [drop_addon_id]
      );
      if (addon) dropFee = addon.price;
    }

    const totalPrice = pricing.total + pickupFee + dropFee;

    // Hitung end_date dari duration_hours
    const startMs = new Date(start_date).getTime();
    const endDate = new Date(startMs + h * 60 * 60 * 1000).toISOString();

    // Buat order ID
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const rand = Math.floor(Math.random() * 9000) + 1000;
    const orderId = `BTL-${dateStr}-${rand}`;

    await dbRun(
      `INSERT INTO bookings (order_id, user_id, item_type, item_name, location, start_date, end_date,
       total_price, status, payment_status, duration_hours, pickup_fee, drop_fee, payment_method)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderId, userId, 'locker',
        `Loker ${locker.type.charAt(0).toUpperCase() + locker.type.slice(1)}`,
        locker.location, start_date, endDate,
        totalPrice, 'pending', 'unpaid',
        h, pickupFee, dropFee, payment_method
      ]
    );

    // Kurangi stok sementara (akan dikembalikan jika dibatalkan)
    await dbRun('UPDATE lockers SET stock = stock - 1 WHERE id = ?', [locker_id]);

    res.status(201).json({
      success: true,
      message: 'Booking loker berhasil dibuat.',
      order_id: orderId,
      total_price: totalPrice
    });
  } catch (err) {
    console.error('POST /loker/checkout error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal membuat booking loker.' });
  }
});

module.exports = router;
