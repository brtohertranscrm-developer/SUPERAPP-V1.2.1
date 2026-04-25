/**
 * PUBLIC LOKER ROUTES — Brothers Trans
 * =====================================
 */

const express = require('express');
const db      = require('../db');
const { calculateLockerPrice, MIN_HOURS } = require('../utils/lockerPricing');
const { verifyUser } = require('../middlewares/authMiddleware'); 
// [PERBAIKAN] Tambahkan Import Telegram Notifikasi
const { notifyNewBooking } = require('../utils/telegram'); 
const router  = express.Router();

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
// ADDON LIST
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
    const { locker_id, duration_hours, pickup_addon_id, drop_addon_id } = req.body || {};

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
    let dropFee   = 0;

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

    res.json({
      success: true,
      data: {
        locker_type:    locker.type,
        duration_hours: parseInt(duration_hours),
        locker_cost:    pricing.total,
        pickup_fee:     pickupFee,
        drop_fee:       dropFee,
        total_price:    pricing.total + pickupFee + dropFee,
        breakdown:      pricing.breakdown
      }
    });
  } catch (err) {
    console.error('POST /loker/calculate error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal menghitung harga.' });
  }
});

// ==========================================
// CHECKOUT LOKER
// ==========================================
router.post('/checkout', verifyUser, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'User ID tidak ditemukan dalam token.' });

    const {
      locker_id,
      duration_hours,
      start_date,
      pickup_addon_id,
      drop_addon_id,
      payment_method = 'transfer'
    } = req.body || {};

    if (!locker_id || !duration_hours || !start_date) {
      return res.status(400).json({
        success: false,
        error: 'Loker, durasi, dan tanggal mulai wajib diisi.'
      });
    }

    const h = parseInt(duration_hours);
    if (isNaN(h) || h < MIN_HOURS) {
      return res.status(400).json({
        success: false,
        error: `Minimal pemesanan adalah ${MIN_HOURS} jam.`
      });
    }

    const locker = await dbGet(
      `SELECT * FROM lockers WHERE id = ? AND stock > 0`,
      [locker_id]
    );
    if (!locker) {
      return res.status(404).json({ success: false, error: 'Loker tidak tersedia atau stok habis.' });
    }

    const pricing = calculateLockerPrice(h, locker.price_1h, locker.price_12h, locker.price_24h);
    if (!pricing.isValid) return res.status(400).json({ success: false, error: pricing.error });

    let pickupFee = 0;
    let dropFee   = 0;

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

    const startMs = new Date(start_date).getTime();
    const endDate = new Date(startMs + h * 60 * 60 * 1000).toISOString();

    const now     = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const rand    = Math.floor(Math.random() * 9000) + 1000;
    const orderId = `BTL-${dateStr}-${rand}`;

    const stockResult = await dbRun(
      `UPDATE lockers SET stock = stock - 1 WHERE id = ? AND stock > 0`,
      [locker_id]
    );

    if (stockResult.changes === 0) {
      return res.status(409).json({ success: false, error: 'Stok loker habis. Silakan pilih loker lain.' });
    }

    const item_name = `Loker ${locker.type.charAt(0).toUpperCase() + locker.type.slice(1)}`;

    try {
      await dbRun(
        `INSERT INTO bookings (order_id, user_id, item_type, item_name, location, start_date, end_date,
         base_price, total_price, status, payment_status, duration_hours, pickup_fee, drop_fee, payment_method)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId, userId, 'locker', item_name, locker.location, start_date, endDate,
          pricing.total, totalPrice, 'pending', 'unpaid', h, pickupFee, dropFee, payment_method
        ]
      );

      // [PERBAIKAN] Panggil notifikasi Telegram 
      dbGet(`SELECT name, phone FROM users WHERE id = ?`, [userId])
        .then((userData) => notifyNewBooking(
          {
            order_id: orderId,
            item_type: 'locker',
            item_name: item_name,
            location: locker.location,
            start_date: start_date,
            end_date: endDate,
            total_price: totalPrice,
            payment_method: payment_method
          },
          userData
        ))
        .catch((err) => console.error('[Telegram] locker booking notify error:', err.message));

    } catch (insertErr) {
      await dbRun(`UPDATE lockers SET stock = stock + 1 WHERE id = ?`, [locker_id]).catch(() => {});
      throw insertErr;
    }

    res.status(201).json({
      success:     true,
      message:     'Booking loker berhasil dibuat.',
      order_id:    orderId,
      total_price: totalPrice
    });
  } catch (err) {
    console.error('POST /loker/checkout error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal membuat booking loker.' });
  }
});

module.exports = router;
