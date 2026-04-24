const express = require('express');
const db = require('../db');
const { verifyUser } = require('../middlewares/authMiddleware');

const router = express.Router();

const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function (err) {
    if (err) return reject(err);
    resolve({ lastID: this.lastID, changes: this.changes });
  });
});
const dbGet = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
});
const dbAll = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || [])));
});

const norm = (v) => String(v || '').trim();

// ==========================================
// POST /api/custom-orders
// Buat permintaan custom order (user, bisa tanpa login)
// ==========================================
router.post('/', async (req, res) => {
  try {
    // Coba baca user dari token jika ada, tapi tidak wajib
    let userId = null;
    let userName = norm(req.body?.user_name);
    let userPhone = norm(req.body?.user_phone);

    const authHeader = req.headers.authorization || '';
    if (authHeader.startsWith('Bearer ')) {
      try {
        const jwt = require('jsonwebtoken');
        const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
        const decoded = jwt.verify(authHeader.slice(7), JWT_SECRET);
        if (decoded?.id) {
          const u = await dbGet(`SELECT id, name, phone FROM users WHERE id = ?`, [decoded.id]);
          if (u) {
            userId = u.id;
            if (!userName) userName = u.name;
            if (!userPhone) userPhone = u.phone;
          }
        }
      } catch {
        // token invalid/expired → tetap lanjut tanpa login
      }
    }

    const unit_type  = norm(req.body?.unit_type);
    const from_city  = norm(req.body?.from_city);
    const to_city    = norm(req.body?.to_city);
    const start_date = norm(req.body?.start_date);
    const end_date   = norm(req.body?.end_date);
    const notes      = norm(req.body?.notes) || null;

    if (!unit_type)  return res.status(400).json({ success: false, error: 'unit_type wajib diisi.' });
    if (!from_city)  return res.status(400).json({ success: false, error: 'from_city wajib diisi.' });
    if (!to_city)    return res.status(400).json({ success: false, error: 'to_city wajib diisi.' });
    if (!start_date) return res.status(400).json({ success: false, error: 'start_date wajib diisi.' });
    if (!end_date)   return res.status(400).json({ success: false, error: 'end_date wajib diisi.' });
    if (from_city === to_city) return res.status(400).json({ success: false, error: 'Kota asal dan tujuan tidak boleh sama.' });

    const today = new Date().toISOString().slice(0, 10);
    if (start_date <= today) return res.status(400).json({ success: false, error: 'Booking minimal H-1 (mulai besok).' });

    const duration_days = Math.round((new Date(end_date) - new Date(start_date)) / 86400000);
    if (duration_days < 3) return res.status(400).json({ success: false, error: 'Minimal 3 hari sewa.' });

    const r = await dbRun(
      `INSERT INTO custom_order_requests
         (user_id, user_name, user_phone, unit_type, from_city, to_city, start_date, end_date, duration_days, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [userId, userName || null, userPhone || null, unit_type, from_city, to_city, start_date, end_date, duration_days, notes]
    );

    const row = await dbGet(`SELECT * FROM custom_order_requests WHERE id = ?`, [r.lastID]);
    res.status(201).json({ success: true, data: row });
  } catch (err) {
    console.error('POST /api/custom-orders error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal menyimpan permintaan.' });
  }
});

// ==========================================
// GET /api/custom-orders/mine
// Riwayat request milik user yang login
// ==========================================
router.get('/mine', verifyUser, async (req, res) => {
  try {
    const rows = await dbAll(
      `SELECT * FROM custom_order_requests WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`,
      [req.user.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /api/custom-orders/mine error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil data.' });
  }
});

module.exports = router;
