/**
 * ADMIN LOKER ROUTES — Brothers Trans
 * =====================================
 * Semua route butuh verifyAdmin + requirePermission('loker')
 * Mount di server.js: app.use('/api/admin/loker', lokerAdminRoutes)
 *
 * Endpoint:
 *   GET    /                    — list semua loker
 *   POST   /                    — tambah loker baru
 *   PUT    /:id                 — edit loker
 *   DELETE /:id                 — hapus loker
 *   GET    /addons              — list addon pickup/drop
 *   POST   /addons              — tambah addon
 *   PUT    /addons/:id          — edit addon
 *   DELETE /addons/:id          — hapus addon
 */

const express = require('express');
const db = require('../db');
const { verifyAdmin, requirePermission } = require('../middlewares/authMiddleware');
const { DEFAULT_PRICING } = require('../utils/lockerPricing');
const router = express.Router();

// ==========================================
// HELPER
// ==========================================
const dbGet = (sql, params = []) => new Promise((resolve, reject) =>
  db.get(sql, params, (err, row) => err ? reject(err) : resolve(row))
);
const dbAll = (sql, params = []) => new Promise((resolve, reject) =>
  db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows || []))
);
const dbRun = (sql, params = []) => new Promise((resolve, reject) =>
  db.run(sql, params, function(err) { err ? reject(err) : resolve({ lastID: this.lastID, changes: this.changes }); })
);

router.use(verifyAdmin);

// ==========================================
// LOKER CRUD
// ==========================================

router.get('/', requirePermission('loker'), async (req, res) => {
  try {
    const rows = await dbAll(
      `SELECT * FROM lockers ORDER BY type ASC, location ASC, id ASC`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /admin/loker error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil data loker.' });
  }
});

router.post('/', requirePermission('loker'), async (req, res) => {
  try {
    const {
      location, stock,
      type = 'terbuka',
      price_1h, price_12h, price_24h,
      dimensions
    } = req.body || {};

    if (!location || !stock) {
      return res.status(400).json({ success: false, error: 'Lokasi dan stok wajib diisi.' });
    }
    if (!['terbuka', 'tertutup'].includes(type)) {
      return res.status(400).json({ success: false, error: 'Tipe harus terbuka atau tertutup.' });
    }

    const defaults = DEFAULT_PRICING[type];
    const p1h   = parseInt(price_1h)  || defaults.price_1h;
    const p12h  = parseInt(price_12h) || defaults.price_12h;
    const p24h  = parseInt(price_24h) || defaults.price_24h;
    const dims  = dimensions || defaults.dimensions;
    // base_price tetap diisi untuk backward compatibility (pakai price_1h)
    const basePrice = p1h;

    const result = await dbRun(
      `INSERT INTO lockers (location, size, base_price, stock, type, price_1h, price_12h, price_24h, dimensions)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [location, type, basePrice, parseInt(stock), type, p1h, p12h, p24h, dims]
    );
    res.status(201).json({ success: true, message: 'Loker berhasil ditambahkan.', id: result.lastID });
  } catch (err) {
    console.error('POST /admin/loker error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal menambahkan loker.' });
  }
});

router.put('/:id', requirePermission('loker'), async (req, res) => {
  try {
    const {
      location, stock,
      type = 'terbuka',
      price_1h, price_12h, price_24h,
      dimensions
    } = req.body || {};

    if (!location || !stock) {
      return res.status(400).json({ success: false, error: 'Lokasi dan stok wajib diisi.' });
    }
    if (!['terbuka', 'tertutup'].includes(type)) {
      return res.status(400).json({ success: false, error: 'Tipe harus terbuka atau tertutup.' });
    }

    const defaults = DEFAULT_PRICING[type];
    const p1h  = parseInt(price_1h)  || defaults.price_1h;
    const p12h = parseInt(price_12h) || defaults.price_12h;
    const p24h = parseInt(price_24h) || defaults.price_24h;
    const dims = dimensions || defaults.dimensions;

    const result = await dbRun(
      `UPDATE lockers SET location = ?, size = ?, base_price = ?, stock = ?,
       type = ?, price_1h = ?, price_12h = ?, price_24h = ?, dimensions = ?
       WHERE id = ?`,
      [location, type, p1h, parseInt(stock), type, p1h, p12h, p24h, dims, req.params.id]
    );
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Loker tidak ditemukan.' });
    }
    res.json({ success: true, message: 'Loker berhasil diperbarui.' });
  } catch (err) {
    console.error('PUT /admin/loker/:id error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal memperbarui loker.' });
  }
});

router.delete('/:id', requirePermission('loker'), async (req, res) => {
  try {
    await dbRun('DELETE FROM lockers WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Loker berhasil dihapus.' });
  } catch (err) {
    console.error('DELETE /admin/loker/:id error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal menghapus loker.' });
  }
});

// ==========================================
// ADDON MANAGEMENT (Pickup & Drop)
// ==========================================

router.get('/addons', requirePermission('loker'), async (req, res) => {
  try {
    const rows = await dbAll(`SELECT * FROM locker_addons ORDER BY addon_type, id`);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /admin/loker/addons error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil data addon.' });
  }
});

router.post('/addons', requirePermission('loker'), async (req, res) => {
  try {
    const { name, description, price, addon_type = 'pickup' } = req.body || {};
    if (!name || price === undefined) {
      return res.status(400).json({ success: false, error: 'Nama dan harga addon wajib diisi.' });
    }
    if (!['pickup', 'drop'].includes(addon_type)) {
      return res.status(400).json({ success: false, error: 'Tipe addon harus pickup atau drop.' });
    }
    const result = await dbRun(
      `INSERT INTO locker_addons (name, description, price, addon_type) VALUES (?, ?, ?, ?)`,
      [name, description || null, parseInt(price), addon_type]
    );
    res.status(201).json({ success: true, message: 'Addon berhasil ditambahkan.', id: result.lastID });
  } catch (err) {
    console.error('POST /admin/loker/addons error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal menambahkan addon.' });
  }
});

router.put('/addons/:id', requirePermission('loker'), async (req, res) => {
  try {
    const { name, description, price, addon_type, is_active } = req.body || {};
    await dbRun(
      `UPDATE locker_addons SET name = ?, description = ?, price = ?, addon_type = ?, is_active = ? WHERE id = ?`,
      [name, description || null, parseInt(price), addon_type, is_active ? 1 : 0, req.params.id]
    );
    res.json({ success: true, message: 'Addon berhasil diperbarui.' });
  } catch (err) {
    console.error('PUT /admin/loker/addons/:id error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal memperbarui addon.' });
  }
});

router.delete('/addons/:id', requirePermission('loker'), async (req, res) => {
  try {
    await dbRun('DELETE FROM locker_addons WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Addon berhasil dihapus.' });
  } catch (err) {
    console.error('DELETE /admin/loker/addons/:id error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal menghapus addon.' });
  }
});

module.exports = router;
