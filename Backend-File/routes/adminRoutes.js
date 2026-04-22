const bcrypt = require('bcrypt');
const fs     = require('fs');
const os     = require('os');
const express = require('express');
const db = require('../db');
const { verifyAdmin, requirePermission } = require('../middlewares/authMiddleware');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

// ==========================================
// HELPER: Promisify DB
// ==========================================
const dbGet = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
});

const dbAll = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows || []));
});

const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function(err) { err ? reject(err) : resolve({ lastID: this.lastID, changes: this.changes }); });
});

// ==========================================
// FILE UPLOAD — [FIX 6] Sanitasi ketat ekstensi & MIME type
// Cegah path traversal via ekstensi ganda (shell.php.jpg)
// ==========================================
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// [FIX 6] Whitelist ekstensi yang diizinkan — hanya ekstensi ini, tidak ada yang lain
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

// [FIX 6] Fungsi sanitasi nama file — ambil HANYA ekstensi terakhir dan validasi
const getSafeExtension = (originalname) => {
  // Ambil ekstensi paling akhir saja (cegah shell.php.jpg → .jpg)
  const ext = path.extname(originalname).toLowerCase();
  // Pastikan ekstensi ada di whitelist
  if (!ALLOWED_EXTENSIONS.includes(ext)) return null;
  return ext;
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    // [FIX 6] Nama file = random hex + ekstensi yang sudah disanitasi
    // Tidak ada nama file asli yang ikut tersimpan — cegah path traversal
    const ext = getSafeExtension(file.originalname);
    if (!ext) {
      return cb(new Error('Tipe file tidak diizinkan.'));
    }
    const randomName = crypto.randomBytes(16).toString('hex');
    cb(null, `artikel-${randomName}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    // [FIX 6] Validasi GANDA: MIME type + ekstensi
    // Keduanya harus valid — tidak cukup salah satu saja
    const mimeOk = ALLOWED_IMAGE_TYPES.includes(file.mimetype);
    const extOk  = getSafeExtension(file.originalname) !== null;

    if (mimeOk && extOk) {
      cb(null, true);
    } else {
      cb(new Error('Tipe file tidak diizinkan. Gunakan JPG, PNG, WebP, atau GIF.'));
    }
  }
});

// Semua route admin butuh verifikasi admin
router.use(verifyAdmin);

// ==========================================
// SETTINGS: MOTOR BILLING MODE (Akses: settings)
// ==========================================
router.get('/settings/motor-billing', requirePermission('settings'), async (req, res) => {
  try {
    const row = await dbGet(
      `SELECT motor_billing_mode, motor_threshold_12h, updated_at
       FROM booking_pricing_settings WHERE id = 1`
    );

    const mode = row?.motor_billing_mode || 'calendar';
    const threshold12h = Number.isFinite(Number(row?.motor_threshold_12h))
      ? Number(row.motor_threshold_12h)
      : 12;

    res.json({
      success: true,
      data: {
        motor_billing_mode: mode,
        motor_threshold_12h: threshold12h,
        updated_at: row?.updated_at || null,
      },
    });
  } catch (err) {
    console.error('GET /admin/settings/motor-billing error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil pengaturan billing motor.' });
  }
});

router.put('/settings/motor-billing', requirePermission('settings'), async (req, res) => {
  try {
    const { motor_billing_mode, motor_threshold_12h } = req.body || {};

    const mode = String(motor_billing_mode || '').trim().toLowerCase();
    if (!['calendar', 'stopwatch'].includes(mode)) {
      return res.status(400).json({ success: false, error: 'Mode billing tidak valid.' });
    }

    const threshold = parseInt(motor_threshold_12h, 10);
    if (!Number.isFinite(threshold) || threshold < 1 || threshold > 23) {
      return res.status(400).json({
        success: false,
        error: 'Threshold 12 jam harus angka 1-23.',
      });
    }

    await dbRun(
      `INSERT INTO booking_pricing_settings (id, motor_billing_mode, motor_threshold_12h, updated_at)
       VALUES (1, ?, ?, datetime('now'))
       ON CONFLICT(id) DO UPDATE SET
         motor_billing_mode = excluded.motor_billing_mode,
         motor_threshold_12h = excluded.motor_threshold_12h,
         updated_at = datetime('now')`,
      [mode, threshold]
    );

    res.json({
      success: true,
      message: 'Pengaturan billing motor berhasil disimpan.',
      data: { motor_billing_mode: mode, motor_threshold_12h: threshold },
    });
  } catch (err) {
    console.error('PUT /admin/settings/motor-billing error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal menyimpan pengaturan billing motor.' });
  }
});

// ==========================================
// DASHBOARD STATS (Akses: dashboard)
// ==========================================
router.get('/stats', requirePermission('dashboard'), async (req, res) => {
  try {
    const period = String(req.query.period || '7d').toLowerCase();

    // Use created_at if available; fallback to start_date for older rows
    const tsExpr = `datetime(COALESCE(created_at, start_date))`;

    let timeWhere = '1=1';
    let periodLabel = '7 Hari Terakhir';

    // Localtime so it matches admin expectation in Indonesia time on VPS (assuming server TZ is local).
    // If VPS runs UTC, it still behaves consistently; labels remain truthful about "server time".
    if (period === 'today') {
      timeWhere = `${tsExpr} >= datetime('now','localtime','start of day')`;
      periodLabel = 'Hari Ini';
    } else if (period === '30d') {
      timeWhere = `${tsExpr} >= datetime('now','localtime','-30 days')`;
      periodLabel = '30 Hari Terakhir';
    } else if (period === 'mtd') {
      timeWhere = `${tsExpr} >= datetime('now','localtime','start of month')`;
      periodLabel = 'Bulan Ini (MTD)';
    } else if (period === 'ytd') {
      timeWhere = `${tsExpr} >= datetime('now','localtime','start of year')`;
      periodLabel = 'Tahun Ini (YTD)';
    } else if (period === 'all') {
      timeWhere = '1=1';
      periodLabel = 'Semua Waktu';
    } else {
      // Default 7d
      timeWhere = `${tsExpr} >= datetime('now','localtime','-7 days')`;
      periodLabel = '7 Hari Terakhir';
    }

    const [revenuePaid, revenueGross, paidCount, pendingPay, activeBookings, activeMotors, activeLockers, pendingKyc] = await Promise.all([
      dbGet(
        `SELECT COALESCE(SUM(total_price), 0) as total
         FROM bookings
         WHERE payment_status = 'paid' AND status != 'cancelled' AND ${timeWhere}`
      ),
      dbGet(
        `SELECT COALESCE(SUM(total_price), 0) as total
         FROM bookings
         WHERE status != 'cancelled' AND ${timeWhere}`
      ),
      dbGet(
        `SELECT COUNT(*) as count
         FROM bookings
         WHERE payment_status = 'paid' AND status != 'cancelled' AND ${timeWhere}`
      ),
      dbGet(
        `SELECT
           COUNT(*) as count,
           COALESCE(SUM(
             CASE
               WHEN payment_status = 'paid' THEN 0
               ELSE (
                 (IFNULL(base_price,0) - IFNULL(discount_amount,0)) +
                 IFNULL(service_fee,0) + IFNULL(extend_fee,0) + IFNULL(addon_fee,0) + IFNULL(delivery_fee,0) -
                 IFNULL(paid_amount,0)
               )
             END
           ), 0) as amount
         FROM bookings
         WHERE status != 'cancelled' AND payment_status != 'paid' AND ${timeWhere}`
      ),
      dbGet(`SELECT COUNT(*) as count FROM bookings WHERE status = 'active' AND ${timeWhere}`),
      dbGet(`SELECT COUNT(*) as count FROM bookings WHERE item_type = 'motor' AND status = 'active' AND ${timeWhere}`),
      dbGet(`SELECT COUNT(*) as count FROM lockers WHERE stock > 0`),
      dbGet(`SELECT COUNT(*) as count FROM users WHERE kyc_status = 'pending'`)
    ]);

    res.json({
      success: true,
      data: {
        period: period,
        periodLabel,
        // backward-compatible: "revenue" historically meant total nilai booking (gross)
        revenue: revenueGross.total,
        revenue_paid: revenuePaid.total,
        revenue_gross: revenueGross.total,
        paid_bookings: paidCount.count,
        pending_payment_count: pendingPay.count,
        pending_payment_amount: pendingPay.amount,
        activeBookings: activeBookings.count,
        activeMotors: activeMotors.count,
        activeLockers: activeLockers.count,
        pendingKyc: pendingKyc.count,
      }
    });

  } catch (err) {
    console.error('GET /admin/stats error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil statistik dashboard.' });
  }
});

// ==========================================
// KYC MANAGEMENT (Akses: users)
// ==========================================
router.get('/kyc', requirePermission('users'), async (req, res) => {
  try {
    const rows = await dbAll(
      `SELECT id, name, email, phone, ktp_id, kyc_status, kyc_code, miles
       FROM users WHERE role = 'user' ORDER BY join_date DESC`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /admin/kyc error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil data KYC.' });
  }
});

// ==========================================
// KTP BLACKLIST (Akses: users)
// ==========================================
router.get('/ktp-blacklist', requirePermission('users'), async (req, res) => {
  try {
    const rows = await dbAll(
      `SELECT id, ktp_id, reason, created_by, created_at
       FROM ktp_blacklist ORDER BY created_at DESC`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /admin/ktp-blacklist error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil blacklist KTP.' });
  }
});

router.post('/ktp-blacklist', requirePermission('users'), async (req, res) => {
  try {
    const raw = req.body || {};
    const ktp_id = String(raw.ktp_id || raw.nik || '').replace(/\D/g, '');
    const reason = raw.reason ? String(raw.reason).trim().slice(0, 500) : null;
    if (!ktp_id || ktp_id.length !== 16) {
      return res.status(400).json({ success: false, error: 'ID KTP harus 16 digit angka.' });
    }

    await dbRun(
      `INSERT OR REPLACE INTO ktp_blacklist (ktp_id, reason, created_by, created_at)
       VALUES (?, ?, ?, datetime('now'))`,
      [ktp_id, reason, req.user.id]
    );

    res.status(201).json({ success: true, message: 'KTP berhasil ditambahkan ke blacklist.' });
  } catch (err) {
    console.error('POST /admin/ktp-blacklist error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal menambahkan blacklist KTP.' });
  }
});

router.delete('/ktp-blacklist/:ktpId', requirePermission('users'), async (req, res) => {
  try {
    const ktp_id = String(req.params.ktpId || '').replace(/\D/g, '');
    if (!ktp_id || ktp_id.length !== 16) {
      return res.status(400).json({ success: false, error: 'ID KTP tidak valid.' });
    }
    await dbRun(`DELETE FROM ktp_blacklist WHERE ktp_id = ?`, [ktp_id]);
    res.json({ success: true, message: 'KTP berhasil dihapus dari blacklist.' });
  } catch (err) {
    console.error('DELETE /admin/ktp-blacklist/:ktpId error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal menghapus blacklist KTP.' });
  }
});

router.post('/kyc/:id/code', requirePermission('users'), async (req, res) => {
  try {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let newCode = 'BT-';
    for (let i = 0; i < 6; i++) newCode += chars.charAt(Math.floor(Math.random() * chars.length));

    await dbRun(`UPDATE users SET kyc_code = ? WHERE id = ?`, [newCode, req.params.id]);
    res.json({ success: true, code: newCode });

  } catch (err) {
    console.error('POST /admin/kyc/:id/code error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal membuat kode KYC.' });
  }
});

router.put('/kyc/:id', requirePermission('users'), async (req, res) => {
  try {
    const { status } = req.body || {};
    const validStatuses = ['unverified', 'pending', 'verified', 'rejected'];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: 'Status KYC tidak valid.' });
    }

    const query = status === 'rejected'
      ? `UPDATE users SET kyc_status = ?, kyc_code = NULL WHERE id = ?`
      : `UPDATE users SET kyc_status = ? WHERE id = ?`;

    await dbRun(query, [status, req.params.id]);
    res.json({ success: true, message: `Status KYC berhasil diubah menjadi ${status}.` });

  } catch (err) {
    console.error('PUT /admin/kyc/:id error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengubah status KYC.' });
  }
});

// ==========================================
// MOTOR UNITS — ALL (untuk FleetInventoryTable)
// [FIX P8] Endpoint baru — ambil semua unit beserta nama motor & kategori
// ==========================================
router.get('/motor-units-all', requirePermission('armada'), async (req, res) => {
  try {
    const rows = await dbAll(`
      SELECT mu.id, mu.motor_id, mu.plate_number, mu.status, mu.condition_notes,
             m.name  AS motor_name,
             m.category AS motor_category
      FROM motor_units mu
      JOIN motors m ON mu.motor_id = m.id
      ORDER BY m.category ASC, m.name ASC, mu.plate_number ASC
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /admin/motor-units-all error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil data unit.' });
  }
});

// ==========================================
// ARMADA MOTOR (Akses: armada)
// ==========================================
router.get('/motors', requirePermission('armada'), async (req, res) => {
  try {
    const rows = await dbAll(`
      SELECT m.*, 
             (SELECT COUNT(*) FROM motor_units mu WHERE mu.motor_id = m.id AND mu.status = 'RDY') as active_stock,
             (SELECT COUNT(*) FROM motor_units mu WHERE mu.motor_id = m.id) as total_units
      FROM motors m ORDER BY m.id DESC
    `);

    const data = rows.map(r => ({ ...r, stock: r.active_stock }));
    res.json({ success: true, data });

  } catch (err) {
    console.error('GET /admin/motors error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil data armada.' });
  }
});

router.post('/motors', requirePermission('armada'), async (req, res) => {
  try {
    // 1. Tambahkan cc di sini
    const { name, cc, category, location, price_12h, base_price, image_url, allow_dynamic_pricing } = req.body || {};

    if (!name || !category || !base_price) {
      return res.status(400).json({ success: false, error: 'Nama, kategori, dan harga dasar wajib diisi.' });
    }

    const isDynamic = (allow_dynamic_pricing === false || allow_dynamic_pricing === 0 || allow_dynamic_pricing === '0') ? 0 : 1;

    // 2. Tambahkan cc ke query INSERT
    const result = await dbRun(
      `INSERT INTO motors (name, cc, category, location, price_12h, base_price, stock, image_url, allow_dynamic_pricing) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [name.trim(), cc === 'Listrik' ? 'Listrik' : (parseInt(cc) || 125), category, location || 'Lempuyangan', parseInt(price_12h) || 0, parseInt(base_price), image_url || null, isDynamic]
    );

    res.status(201).json({ success: true, message: 'Katalog Motor ditambahkan.', id: result.lastID });

  } catch (err) {
    console.error('POST /admin/motors error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal menambahkan motor.' });
  }
});

router.put('/motors/:id', requirePermission('armada'), async (req, res) => {
  try {
    // 1. Tambahkan cc di sini
    const { name, cc, category, location, price_12h, base_price, image_url, allow_dynamic_pricing } = req.body || {};

    if (!name || !category || !base_price) {
      return res.status(400).json({ success: false, error: 'Nama, kategori, dan harga dasar wajib diisi.' });
    }

    const isDynamic = (allow_dynamic_pricing === false || allow_dynamic_pricing === 0 || allow_dynamic_pricing === '0') ? 0 : 1;

    // 2. Tambahkan cc=? ke query UPDATE
    await dbRun(
      `UPDATE motors SET name=?, cc=?, category=?, location=?, price_12h=?, base_price=?, image_url=?, allow_dynamic_pricing=? WHERE id=?`,
      [name.trim(), cc === 'Listrik' ? 'Listrik' : (parseInt(cc) || 125), category, location, parseInt(price_12h) || 0, parseInt(base_price), image_url, isDynamic, req.params.id]
    );

    res.json({ success: true, message: 'Data katalog berhasil diupdate.' });

  } catch (err) {
    console.error('PUT /admin/motors/:id error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengupdate motor.' });
  }
});

router.delete('/motors/:id', requirePermission('armada'), async (req, res) => {
  try {
    await dbRun('DELETE FROM motors WHERE id=?', [req.params.id]);
    res.json({ success: true, message: 'Motor beserta semua unit berhasil dihapus.' });

  } catch (err) {
    console.error('DELETE /admin/motors/:id error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal menghapus motor.' });
  }
});

// ==========================================
// UNIT PLAT NOMOR (Akses: armada)
// ==========================================
router.get('/motors/:id/units', requirePermission('armada'), async (req, res) => {
  try {
    const rows = await dbAll('SELECT * FROM motor_units WHERE motor_id = ? ORDER BY id DESC', [req.params.id]);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /admin/motors/:id/units error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil data unit.' });
  }
});

router.post('/motors/:id/units', requirePermission('armada'), async (req, res) => {
  try {
    const { plate_number, status, condition_notes } = req.body || {};

    if (!plate_number || plate_number.trim().length < 3) {
      return res.status(400).json({ success: false, error: 'Plat nomor wajib diisi (minimal 3 karakter).' });
    }

    const validStatuses = ['RDY', 'SVC', 'OUT'];
    const unitStatus = validStatuses.includes(status) ? status : 'RDY';

    const result = await dbRun(
      `INSERT INTO motor_units (motor_id, plate_number, status, condition_notes) VALUES (?, ?, ?, ?)`,
      [req.params.id, plate_number.trim().toUpperCase(), unitStatus, condition_notes || null]
    );

    res.status(201).json({ success: true, message: 'Unit plat nomor ditambahkan.', id: result.lastID });

  } catch (err) {
    if (err.message.includes('UNIQUE constraint')) {
      return res.status(409).json({ success: false, error: 'Plat nomor sudah terdaftar.' });
    }
    console.error('POST /admin/motors/:id/units error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal menambahkan unit.' });
  }
});

router.put('/units/:unitId', requirePermission('armada'), async (req, res) => {
  try {
    const { plate_number, status, condition_notes } = req.body || {};

    if (!plate_number) {
      return res.status(400).json({ success: false, error: 'Plat nomor wajib diisi.' });
    }

    await dbRun(
      `UPDATE motor_units SET plate_number=?, status=?, condition_notes=? WHERE id=?`,
      [plate_number.trim().toUpperCase(), status || 'RDY', condition_notes || null, req.params.unitId]
    );

    res.json({ success: true, message: 'Status unit berhasil diupdate.' });

  } catch (err) {
    if (err.message.includes('UNIQUE constraint')) {
      return res.status(409).json({ success: false, error: 'Plat nomor sudah digunakan unit lain.' });
    }
    console.error('PUT /admin/units/:unitId error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengupdate unit.' });
  }
});

router.delete('/units/:unitId', requirePermission('armada'), async (req, res) => {
  try {
    await dbRun('DELETE FROM motor_units WHERE id=?', [req.params.unitId]);
    res.json({ success: true, message: 'Unit berhasil dihapus.' });
  } catch (err) {
    console.error('DELETE /admin/units/:unitId error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal menghapus unit.' });
  }
});

// ==========================================
// TRANSAKSI & BOOKING (Akses: booking)
// ==========================================
router.get('/bookings', requirePermission('booking'), async (req, res) => {
  try {
    const rows = await dbAll(`
      SELECT b.*, 
             IFNULL(b.base_price, 0) as base_price,
             IFNULL(b.discount_amount, 0) as discount_amount,
             IFNULL(b.service_fee, 0) as service_fee,
             IFNULL(b.extend_fee, 0) as extend_fee,
             IFNULL(b.addon_fee, 0) as addon_fee,
             IFNULL(b.delivery_fee, 0) as delivery_fee,
             IFNULL(b.paid_amount, 0) as paid_amount,
             u.name as user_name, u.phone as user_phone 
      FROM bookings b LEFT JOIN users u ON b.user_id = u.id 
      ORDER BY b.start_date DESC
    `);
    
    const formattedData = rows.map(b => {
      const calc_total = 
        (Number(b.base_price) || 0) - (Number(b.discount_amount) || 0) + 
        (Number(b.service_fee) || 0) + (Number(b.extend_fee) || 0) + 
        (Number(b.addon_fee) || 0) + (Number(b.delivery_fee) || 0);
        
      const final_total  = calc_total > 0 ? calc_total : (Number(b.total_price) || 0);
      const outstanding  = b.payment_status === 'paid'
        ? 0
        : Math.max(0, final_total - (Number(b.paid_amount) || 0));

      return { ...b, total_price: final_total, outstanding_amount: outstanding };
    });

    res.json({ success: true, data: formattedData });
  } catch (err) {
    console.error('GET /admin/bookings error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil data transaksi.' });
  }
});

router.get('/bookings/:orderId', requirePermission('booking'), async (req, res) => {
  try {
    const row = await dbGet(`
      SELECT b.*, 
             IFNULL(b.base_price, 0) as base_price,
             IFNULL(b.discount_amount, 0) as discount_amount,
             IFNULL(b.service_fee, 0) as service_fee,
             IFNULL(b.extend_fee, 0) as extend_fee,
             IFNULL(b.addon_fee, 0) as addon_fee,
             IFNULL(b.delivery_fee, 0) as delivery_fee,
             IFNULL(b.paid_amount, 0) as paid_amount,
             u.name as user_name, u.email as user_email, u.phone as user_phone 
      FROM bookings b LEFT JOIN users u ON b.user_id = u.id 
      WHERE b.order_id = ?
    `, [req.params.orderId]);

    if (!row) {
      return res.status(404).json({ success: false, error: 'Transaksi tidak ditemukan.' });
    }

    const calc_total = 
        (Number(row.base_price) || 0) - (Number(row.discount_amount) || 0) + 
        (Number(row.service_fee) || 0) + (Number(row.extend_fee) || 0) + 
        (Number(row.addon_fee) || 0) + (Number(row.delivery_fee) || 0);
        
    const final_total = calc_total > 0 ? calc_total : (Number(row.total_price) || 0);
    const outstanding = row.payment_status === 'paid'
      ? 0
      : Math.max(0, final_total - (Number(row.paid_amount) || 0));

    res.json({ success: true, data: { ...row, total_price: final_total, outstanding_amount: outstanding } });
  } catch (err) {
    console.error('GET /admin/bookings/:orderId error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil detail transaksi.' });
  }
});

router.put('/bookings/:orderId/pricing', requirePermission('booking'), async (req, res) => {
  try {
    const { orderId } = req.params;
    const {
      base_price, discount_amount, promo_code, service_fee, extend_fee,
      addon_fee, delivery_fee, paid_amount, price_notes
    } = req.body || {};

    const new_total = 
      (Number(base_price) || 0) - (Number(discount_amount) || 0) + 
      (Number(service_fee) || 0) + (Number(extend_fee) || 0) + 
      (Number(addon_fee) || 0) + (Number(delivery_fee) || 0);

    await dbRun(`
      UPDATE bookings 
      SET base_price=?, discount_amount=?, promo_code=?, service_fee=?, extend_fee=?, 
          addon_fee=?, delivery_fee=?, paid_amount=?, total_price=?, price_notes=?
      WHERE order_id=?
    `, [
      base_price || 0, discount_amount || 0, promo_code || null, service_fee || 0, extend_fee || 0, 
      addon_fee || 0, delivery_fee || 0, paid_amount || 0, new_total, price_notes || null, orderId
    ]);

    res.json({ success: true, message: 'Rincian harga berhasil diperbarui.' });

  } catch (err) {
    console.error('PUT /admin/bookings/:orderId/pricing error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal memperbarui rincian harga.' });
  }
});

router.put('/bookings/:orderId/status', requirePermission('booking'), async (req, res) => {
  try {
    const { status, payment_status, unit_id, plate_number } = req.body || {};

    const validStatuses = ['pending', 'active', 'completed', 'cancelled', 'selesai'];
    if (!status || !validStatuses.includes(status.toLowerCase())) {
      return res.status(400).json({ success: false, error: 'Status tidak valid.' });
    }

    // Fetch current booking to support syncing paid_amount when payment_status is changed.
    const current = await dbGet(
      `SELECT order_id,
              IFNULL(base_price, 0) as base_price,
              IFNULL(discount_amount, 0) as discount_amount,
              IFNULL(service_fee, 0) as service_fee,
              IFNULL(extend_fee, 0) as extend_fee,
              IFNULL(addon_fee, 0) as addon_fee,
              IFNULL(delivery_fee, 0) as delivery_fee,
              IFNULL(paid_amount, 0) as paid_amount,
              IFNULL(total_price, 0) as total_price,
              payment_status
       FROM bookings WHERE order_id = ? LIMIT 1`,
      [req.params.orderId]
    );
    if (!current) {
      return res.status(404).json({ success: false, error: 'Transaksi tidak ditemukan.' });
    }

    const calcTotal =
      (Number(current.base_price) || 0) -
      (Number(current.discount_amount) || 0) +
      (Number(current.service_fee) || 0) +
      (Number(current.extend_fee) || 0) +
      (Number(current.addon_fee) || 0) +
      (Number(current.delivery_fee) || 0);

    const finalTotal = calcTotal > 0 ? calcTotal : (Number(current.total_price) || 0);

    let setClauses = ['status = ?'];
    let params = [status];

    if (payment_status) { setClauses.push('payment_status = ?'); params.push(payment_status); }
    if (unit_id)        { setClauses.push('unit_id = ?');        params.push(unit_id); }
    if (plate_number)   { setClauses.push('plate_number = ?');   params.push(plate_number); }

    // Sync paid_amount so "outstanding" becomes correct.
    // This complements finance reconciliation flow which already updates paid_amount.
    if (payment_status === 'paid') {
      setClauses.push('paid_amount = ?');
      params.push(finalTotal);
    }
    if (payment_status === 'unpaid') {
      setClauses.push('paid_amount = ?');
      params.push(0);
    }

    params.push(req.params.orderId);

    await dbRun(`UPDATE bookings SET ${setClauses.join(', ')} WHERE order_id = ?`, params);

    const completedStatuses = ['completed', 'selesai'];
    if (completedStatuses.includes(status.toLowerCase())) {
      try {
        const booking = await dbGet(
          `SELECT user_id, total_price FROM bookings WHERE order_id = ?`,
          [req.params.orderId]
        );
        if (booking) {
          const earnedMiles = Math.floor(booking.total_price / 10000);
          if (earnedMiles > 0) {
            await dbRun(`UPDATE users SET miles = miles + ? WHERE id = ?`, [earnedMiles, booking.user_id]);
          }
        }
      } catch (milesErr) {
        console.error('⚠️  Gagal menambahkan miles:', milesErr.message);
      }
    }

    res.json({ success: true, message: 'Status transaksi berhasil diupdate.' });

  } catch (err) {
    console.error('PUT /admin/bookings/:orderId/status error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengupdate status transaksi.' });
  }
});

// ==========================================
// DYNAMIC & SEASONAL PRICING (Akses: pricing)
// ==========================================
router.get('/pricing/surge', requirePermission('pricing'), async (req, res) => {
  try {
    const row = await dbGet(`SELECT * FROM price_rules WHERE rule_type = 'surge'`);
    res.json({ success: true, data: row || null });
  } catch (err) {
    console.error('GET /admin/pricing/surge error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil data surge pricing.' });
  }
});

router.put('/pricing/surge', requirePermission('pricing'), async (req, res) => {
  try {
    const { is_active, markup_percentage, stock_condition } = req.body || {};

    if (markup_percentage === undefined || markup_percentage === null) {
      return res.status(400).json({ success: false, error: 'Persentase markup wajib diisi.' });
    }

    const isActiveInt = is_active ? 1 : 0;
    const markupInt   = parseInt(markup_percentage);

    if (isNaN(markupInt) || markupInt < 0 || markupInt > 200) {
      return res.status(400).json({ success: false, error: 'Markup harus antara 0-200%.' });
    }

    const existing = await dbGet(`SELECT id FROM price_rules WHERE rule_type = 'surge'`);

    if (existing) {
      await dbRun(
        `UPDATE price_rules SET is_active = ?, markup_percentage = ?, stock_condition = ? WHERE rule_type = 'surge'`,
        [isActiveInt, markupInt, stock_condition || null]
      );
    } else {
      await dbRun(
        `INSERT INTO price_rules (rule_type, name, is_active, markup_percentage, stock_condition) VALUES ('surge', 'Surge Pricing', ?, ?, ?)`,
        [isActiveInt, markupInt, stock_condition || null]
      );
    }

    res.json({ success: true, message: 'Surge pricing berhasil disimpan.' });

  } catch (err) {
    console.error('PUT /admin/pricing/surge error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal menyimpan surge pricing.' });
  }
});

router.get('/pricing/seasonal', requirePermission('pricing'), async (req, res) => {
  try {
    const rows = await dbAll(`SELECT * FROM price_rules WHERE rule_type = 'seasonal' ORDER BY start_date ASC`);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /admin/pricing/seasonal error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil data seasonal pricing.' });
  }
});

router.post('/pricing/seasonal', requirePermission('pricing'), async (req, res) => {
  try {
    const { rules } = req.body || {};

    await dbRun(`DELETE FROM price_rules WHERE rule_type = 'seasonal'`);

    if (!rules || !Array.isArray(rules) || rules.length === 0) {
      return res.json({ success: true, message: 'Semua event seasonal berhasil dikosongkan.' });
    }

    for (const rule of rules) {
      if (!rule.name || !rule.startDate || !rule.endDate || !rule.markup) {
        return res.status(400).json({ success: false, error: 'Setiap event harus memiliki nama, tanggal mulai, tanggal selesai, dan markup.' });
      }
    }

    const placeholders = rules.map(() => `('seasonal', ?, ?, ?, ?)`).join(',');
    const values = [];
    rules.forEach(rule => values.push(rule.name, rule.startDate, rule.endDate, parseInt(rule.markup)));

    await dbRun(
      `INSERT INTO price_rules (rule_type, name, start_date, end_date, markup_percentage) VALUES ${placeholders}`,
      values
    );

    res.json({ success: true, message: `${rules.length} event seasonal berhasil disimpan.` });

  } catch (err) {
    console.error('POST /admin/pricing/seasonal error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal menyimpan seasonal pricing.' });
  }
});

// ==========================================
// KODE PROMO MANAGEMENT (Akses: pricing)
// ==========================================
router.get('/promos', requirePermission('pricing'), async (req, res) => {
  try {
    const rows = await dbAll(`SELECT * FROM promotions ORDER BY id DESC`);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /admin/promos error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil data promo.' });
  }
});

router.post('/promos', requirePermission('pricing'), async (req, res) => {
  try {
    const {
      title,
      code,
      image,
      desc,
      tag,
      discount_percent,
      max_discount,
      usage_limit,
    } = req.body || {};

    if (!code || !discount_percent) {
      return res.status(400).json({ success: false, error: 'Kode promo dan persentase diskon wajib diisi.' });
    }

    const discountInt = parseInt(discount_percent);
    if (isNaN(discountInt) || discountInt < 1 || discountInt > 100) {
      return res.status(400).json({ success: false, error: 'Diskon harus antara 1-100%.' });
    }

    const result = await dbRun(
      `INSERT INTO promotions (title, code, image, discount_percent, max_discount, usage_limit, current_usage, is_active) 
       VALUES (?, ?, ?, ?, ?, ?, 0, 1)`,
      [
        (title || 'Promo Spesial').trim(),
        code.trim().toUpperCase(),
        (image || 'default-promo.jpg').trim(),
        discountInt,
        parseInt(max_discount) || 0,
        parseInt(usage_limit) || 0,
      ]
    );

    // Optional fields (exist in schema but not used in insert above)
    // Keep it a separate update so we don't break older DBs missing columns.
    await dbRun(
      `UPDATE promotions SET desc = ?, tag = ? WHERE id = ?`,
      [desc || null, tag || null, result.lastID]
    );

    const created = await dbGet(`SELECT * FROM promotions WHERE id = ?`, [result.lastID]);
    res.status(201).json({ success: true, message: 'Promo berhasil ditambahkan.', id: result.lastID, data: created });

  } catch (err) {
    console.error('POST /admin/promos error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal menambahkan promo.' });
  }
});

router.put('/promos/:id', requirePermission('pricing'), async (req, res) => {
  try {
    const {
      title,
      code,
      image,
      desc,
      tag,
      discount_percent,
      max_discount,
      usage_limit,
    } = req.body || {};

    if (!code || !discount_percent) {
      return res.status(400).json({ success: false, error: 'Kode promo dan persentase diskon wajib diisi.' });
    }

    const existing = await dbGet(`SELECT * FROM promotions WHERE id = ?`, [req.params.id]);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Promo tidak ditemukan.' });
    }

    await dbRun(
      `UPDATE promotions
       SET title = ?, code = ?, image = ?, desc = ?, tag = ?, discount_percent = ?, max_discount = ?, usage_limit = ?
       WHERE id = ?`,
      [
        (title || existing.title || 'Promo Spesial').trim(),
        code.trim().toUpperCase(),
        (image || existing.image || 'default-promo.jpg').trim(),
        desc !== undefined ? (desc || null) : (existing.desc || null),
        tag !== undefined ? (tag || null) : (existing.tag || null),
        parseInt(discount_percent),
        parseInt(max_discount) || 0,
        parseInt(usage_limit) || 0,
        req.params.id,
      ]
    );

    const updated = await dbGet(`SELECT * FROM promotions WHERE id = ?`, [req.params.id]);
    res.json({ success: true, message: 'Promo berhasil diperbarui.', data: updated });

  } catch (err) {
    console.error('PUT /admin/promos/:id error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal memperbarui promo.' });
  }
});

router.put('/promos/:id/toggle', requirePermission('pricing'), async (req, res) => {
  try {
    const { is_active } = req.body || {};
    await dbRun(`UPDATE promotions SET is_active = ? WHERE id = ?`, [is_active ? 1 : 0, req.params.id]);
    res.json({ success: true, message: 'Status promo berhasil diupdate.' });
  } catch (err) {
    console.error('PUT /admin/promos/:id/toggle error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengubah status promo.' });
  }
});

router.delete('/promos/:id', requirePermission('pricing'), async (req, res) => {
  try {
    await dbRun(`DELETE FROM promotions WHERE id = ?`, [req.params.id]);
    res.json({ success: true, message: 'Promo berhasil dihapus.' });
  } catch (err) {
    console.error('DELETE /admin/promos/:id error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal menghapus promo.' });
  }
});

// ==========================================
// ARTIKEL MANAGEMENT (Akses: artikel)
// ==========================================
router.get('/articles', requirePermission('artikel'), async (req, res) => {
  try {
    const rows = await dbAll(`SELECT * FROM articles ORDER BY created_at DESC`);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /admin/articles error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil data artikel.' });
  }
});

router.post('/articles', requirePermission('artikel'), async (req, res) => {
  try {
    const { title, slug, category, image_url, content, status, meta_title, meta_desc, geo_location, scheduled_at } = req.body || {};

    if (!title || !content) {
      return res.status(400).json({ success: false, error: 'Judul dan konten artikel wajib diisi.' });
    }

    const articleSlug = slug 
      ? slug.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      : title.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now();

    const result = await dbRun(
      `INSERT INTO articles (title, slug, category, image_url, content, status, meta_title, meta_desc, geo_location, scheduled_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title.trim(), articleSlug, category || 'Berita', image_url || null, content, status || 'draft', meta_title || null, meta_desc || null, geo_location || null, scheduled_at || null]
    );

    res.status(201).json({ success: true, message: 'Artikel berhasil ditambahkan.', id: result.lastID });

  } catch (err) {
    if (err.message.includes('UNIQUE constraint')) {
      return res.status(409).json({ success: false, error: 'Slug URL sudah digunakan.' });
    }
    console.error('POST /admin/articles error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal menambahkan artikel.' });
  }
});

router.put('/articles/:id', requirePermission('artikel'), async (req, res) => {
  try {
    const { title, slug, category, image_url, content, status, meta_title, meta_desc, geo_location, scheduled_at } = req.body || {};

    if (!title || !content) {
      return res.status(400).json({ success: false, error: 'Judul dan konten artikel wajib diisi.' });
    }

    await dbRun(
      `UPDATE articles SET title=?, slug=?, category=?, image_url=?, content=?, status=?, meta_title=?, meta_desc=?, geo_location=?, scheduled_at=? WHERE id=?`,
      [title.trim(), slug, category, image_url, content, status, meta_title, meta_desc, geo_location, scheduled_at, req.params.id]
    );

    res.json({ success: true, message: 'Artikel berhasil diperbarui.' });

  } catch (err) {
    if (err.message.includes('UNIQUE constraint')) {
      return res.status(409).json({ success: false, error: 'Slug URL sudah digunakan.' });
    }
    console.error('PUT /admin/articles/:id error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal memperbarui artikel.' });
  }
});

router.delete('/articles/:id', requirePermission('artikel'), async (req, res) => {
  try {
    await dbRun(`DELETE FROM articles WHERE id=?`, [req.params.id]);
    res.json({ success: true, message: 'Artikel berhasil dihapus.' });
  } catch (err) {
    console.error('DELETE /admin/articles/:id error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal menghapus artikel.' });
  }
});

// [FIX 6] UPLOAD GAMBAR — validasi MIME type + ekstensi ganda
router.post('/upload', requirePermission('artikel'), (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ success: false, error: 'Ukuran file terlalu besar. Maksimal 5MB.' });
      }
      return res.status(400).json({ success: false, error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Tidak ada file yang diunggah.' });
    }

    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    res.json({ success: true, url: fileUrl });
  });
});

// ==========================================
// ADMIN & ROLE MANAGEMENT (Akses: settings)
// ==========================================
router.get('/admins', requirePermission('settings'), async (req, res) => {
  try {
    const rows = await dbAll(
      `SELECT id, name, email, phone, role, permissions, join_date 
       FROM users WHERE role IN ('admin', 'superadmin', 'subadmin') ORDER BY join_date DESC`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /admin/admins error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil data admin.' });
  }
});

router.post('/admins', requirePermission('settings'), async (req, res) => {
  try {
    const { name, email, password, phone, role, permissions } = req.body || {};

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Nama, email, dan password wajib diisi.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password minimal 6 karakter.' });
    }

    const validRoles = ['admin', 'subadmin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, error: 'Role tidak valid. Gunakan admin atau subadmin.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const id = 'A-' + Date.now();
    const permsString = JSON.stringify(permissions || []);

    await dbRun(
      `INSERT INTO users (id, name, email, password, phone, role, permissions, join_date, kyc_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'approved')`,
      [id, name.trim(), email.toLowerCase().trim(), hashedPassword, phone || '-', role, permsString, new Date().toISOString()]
    );

    res.status(201).json({ success: true, message: 'Akun admin berhasil ditambahkan.' });

  } catch (err) {
    if (err.message.includes('UNIQUE constraint')) {
      return res.status(409).json({ success: false, error: 'Email sudah digunakan.' });
    }
    console.error('POST /admin/admins error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal menambahkan admin.' });
  }
});

router.delete('/admins/:id', requirePermission('settings'), async (req, res) => {
  try {
    if (req.user.id === req.params.id) {
      return res.status(400).json({ success: false, error: 'Tidak bisa menghapus akun Anda sendiri.' });
    }

    const target = await dbGet(`SELECT role FROM users WHERE id = ?`, [req.params.id]);
    if (!target) {
      return res.status(404).json({ success: false, error: 'Admin tidak ditemukan.' });
    }

    if (target.role === 'superadmin') {
      return res.status(403).json({ success: false, error: 'Tidak bisa menghapus akun Superadmin.' });
    }

    await dbRun(`DELETE FROM users WHERE id = ?`, [req.params.id]);
    res.json({ success: true, message: 'Akun admin berhasil dihapus.' });

  } catch (err) {
    console.error('DELETE /admin/admins/:id error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal menghapus admin.' });
  }
});


// ==========================================
// DATABASE BACKUP & RESTORE
// Hanya superadmin yang bisa akses
// ==========================================

// Multer untuk upload DB file
const dbUploadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, os.tmpdir());
  },
  filename: (req, file, cb) => {
    cb(null, 'restore_' + Date.now() + '.db');
  },
});
const uploadDb = multer({
  storage: dbUploadStorage,
  limits: { fileSize: 100 * 1024 * 1024 }, // max 100MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    ext === '.db' || ext === '.sqlite'
      ? cb(null, true)
      : cb(new Error('Hanya file .db atau .sqlite yang diizinkan.'));
  },
});

// GET /api/admin/database/export — download file DB langsung
router.get('/database/export', async (req, res) => {
  try {
    // Hanya superadmin
    if (req.user.role !== 'superadmin' && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Akses ditolak.' });
    }

    const dbPath = require('path').resolve(__dirname, '../brother_trans.db');
    if (!fs.existsSync(dbPath)) {
      return res.status(404).json({ success: false, error: 'File database tidak ditemukan.' });
    }

    const timestamp  = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename   = 'brother_trans_backup_' + timestamp + '.db';

    res.setHeader('Content-Disposition', 'attachment; filename="' + filename + '"');
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', fs.statSync(dbPath).size);

    const stream = fs.createReadStream(dbPath);
    stream.pipe(res);

    stream.on('error', (err) => {
      console.error('Export DB stream error:', err.message);
      if (!res.headersSent) res.status(500).json({ success: false, error: 'Gagal mengekspor database.' });
    });

  } catch (err) {
    console.error('GET /admin/database/export error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengekspor database.' });
  }
});

// POST /api/admin/database/restore — upload & replace DB
router.post('/database/restore', (req, res) => {
  // Hanya superadmin
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ success: false, error: 'Akses ditolak.' });
  }

  uploadDb.single('database')(req, res, async (err) => {
    if (err) return res.status(400).json({ success: false, error: err.message });
    if (!req.file) return res.status(400).json({ success: false, error: 'File database wajib diunggah.' });

    const dbPath     = require('path').resolve(__dirname, '../brother_trans.db');
    const backupPath = dbPath.replace('.db', '_pre_restore_' + Date.now() + '.db');
    const uploadedPath = req.file.path;

    try {
      // 1. Validasi file yang diupload adalah SQLite yang valid
      const { execSync } = require('child_process');
      try {
        const out = execSync('sqlite3 "' + uploadedPath + '" "PRAGMA integrity_check;" 2>&1', { timeout: 10000 })
          .toString()
          .trim()
          .toLowerCase();
        if (out !== 'ok') {
          fs.unlinkSync(uploadedPath);
          return res.status(400).json({ success: false, error: 'File database tidak valid atau corrupt.' });
        }
      } catch {
        fs.unlinkSync(uploadedPath);
        return res.status(400).json({ success: false, error: 'File database tidak valid atau corrupt.' });
      }

      // 2. Backup DB saat ini sebelum diganti (dan pastikan backup valid)
      if (fs.existsSync(dbPath)) {
        fs.copyFileSync(dbPath, backupPath);
        try {
          const out = execSync('sqlite3 "' + backupPath + '" "PRAGMA integrity_check;" 2>&1', { timeout: 10000 })
            .toString()
            .trim()
            .toLowerCase();
          if (out !== 'ok') {
            fs.unlinkSync(uploadedPath);
            return res.status(500).json({
              success: false,
              error: 'Backup otomatis gagal divalidasi (DB saat ini kemungkinan corrupt). Batalkan restore untuk keamanan.',
            });
          }
        } catch {
          fs.unlinkSync(uploadedPath);
          return res.status(500).json({
            success: false,
            error: 'Backup otomatis gagal divalidasi. Batalkan restore untuk keamanan.',
          });
        }
      }

      // 3. Replace DB dengan file yang diupload
      fs.copyFileSync(uploadedPath, dbPath);
      fs.unlinkSync(uploadedPath);

      // 4. Restart server agar DB baru terbaca (pm2 restart)
      // Kirim response dulu sebelum restart
      res.json({
        success: true,
        message: 'Database berhasil direstore. Server akan restart otomatis dalam 2 detik.',
        backup: path.basename(backupPath),
      });

      // Restart dengan delay agar response sempat terkirim
      setTimeout(() => {
        try {
          require('child_process').exec('pm2 restart brother-backend');
        } catch {
          process.exit(1); // fallback: exit dan pm2 akan restart otomatis
        }
      }, 2000);

    } catch (restoreErr) {
      // Rollback: kembalikan backup jika ada error
      if (fs.existsSync(backupPath)) {
        fs.copyFileSync(backupPath, dbPath);
        fs.unlinkSync(backupPath);
      }
      if (fs.existsSync(uploadedPath)) fs.unlinkSync(uploadedPath);
      console.error('POST /admin/database/restore error:', restoreErr.message);
      res.status(500).json({ success: false, error: 'Gagal merestore database: ' + restoreErr.message });
    }
  });
});

// GET /api/admin/database/info — info DB saat ini
router.get('/database/info', async (req, res) => {
  try {
    if (req.user.role !== 'superadmin' && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Akses ditolak.' });
    }

    const dbPath = require('path').resolve(__dirname, '../brother_trans.db');
    const stat   = fs.existsSync(dbPath) ? fs.statSync(dbPath) : null;

    const counts = await Promise.all([
      dbGet('SELECT COUNT(*) as c FROM users'),
      dbGet('SELECT COUNT(*) as c FROM bookings'),
      dbGet('SELECT COUNT(*) as c FROM motors'),
    ]);

    res.json({
      success: true,
      data: {
        size_bytes: stat ? stat.size : 0,
        size_mb:    stat ? (stat.size / 1024 / 1024).toFixed(2) : '0',
        modified:   stat ? stat.mtime : null,
        users:      counts[0]?.c || 0,
        bookings:   counts[1]?.c || 0,
        motors:     counts[2]?.c || 0,
      },
    });
  } catch (err) {
    console.error('GET /admin/database/info error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil info database.' });
  }
});

module.exports = router;
