const bcrypt = require('bcrypt');
const fs     = require('fs');
const os     = require('os');
const express = require('express');
const ImageKit = require('imagekit');
const db = require('../db');
const { verifyAdmin, requirePermission, requireAnyPermission, requireAdminRole } = require('../middlewares/authMiddleware');
const { issueTicketVouchersForOrder } = require('../utils/ticketing');
const { calculateLockerPrice, MIN_HOURS: LOCKER_MIN_HOURS } = require('../utils/lockerPricing');
const { notifyNewBooking } = require('../utils/telegram');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { auditAdmin } = require('../middlewares/auditMiddleware');
const { upsertLogisticsTasksForBooking, cancelLogisticsTasksForBooking } = require('../utils/logisticsAutoSync');

// ==========================================
// TIER SYSTEM CONFIG
// ==========================================
const TIER_CONFIG = [
  { id: 'backpacker',   minMiles: 0,    minTrips: 0  },
  { id: 'explorer',     minMiles: 150,  minTrips: 3  },
  { id: 'adventurer',   minMiles: 500,  minTrips: 8  },
  { id: 'road_captain', minMiles: 1500, minTrips: 15 },
  { id: 'legend',       minMiles: 4000, minTrips: 30 },
];

const TIER_MULTIPLIER = {
  backpacker:   1.0,
  explorer:     1.1,
  adventurer:   1.2,
  road_captain: 1.3,
  legend:       1.5,
};

function calcTier(seasonMiles, seasonTrips) {
  let tier = 'backpacker';
  for (const t of TIER_CONFIG) {
    if (seasonMiles >= t.minMiles && seasonTrips >= t.minTrips) tier = t.id;
  }
  return tier;
}

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

const imagekit = (
  process.env.IMAGEKIT_PUBLIC_KEY &&
  process.env.IMAGEKIT_PRIVATE_KEY &&
  process.env.IMAGEKIT_URL_ENDPOINT
) ? new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
}) : null;

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

// Memory upload (no temp file on disk) for generic images (motors, banners, etc.)
const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    const mimeOk = ALLOWED_IMAGE_TYPES.includes(file.mimetype);
    const extOk = getSafeExtension(file.originalname) !== null;
    if (mimeOk && extOk) return cb(null, true);
    return cb(new Error('Tipe file tidak diizinkan. Gunakan JPG, PNG, WebP, atau GIF.'));
  },
});

const ensureUploadsDir = () => {
  try {
    if (!fs.existsSync('uploads')) fs.mkdirSync('uploads', { recursive: true });
  } catch (e) {
    // Will be handled by caller as a failed upload.
  }
};

const saveBufferToLocalUploads = ({ buffer, filename }) => {
  ensureUploadsDir();
  const fullPath = path.join('uploads', filename);
  fs.writeFileSync(fullPath, buffer);
  return `/uploads/${filename}`;
};

const uploadBufferToStorage = async ({ buffer, filename, folder }) => {
  if (imagekit) {
    const uploaded = await imagekit.upload({
      file: Buffer.from(buffer).toString('base64'),
      fileName: filename,
      folder,
      useUniqueFileName: true,
    });
    return {
      provider: 'imagekit',
      url: uploaded.url,
      fileId: uploaded.fileId,
      filePath: uploaded.filePath,
    };
  }

  const url = saveBufferToLocalUploads({ buffer, filename });
  return { provider: 'local', url, fileId: null, filePath: url };
};

// Semua route admin butuh verifikasi admin
router.use(verifyAdmin);
router.use(auditAdmin({ actionPrefix: 'adminRoutes' }));

// Normalize ISO date strings (e.g. 2026-04-22T02:00:00.000Z) into a SQLite-friendly datetime
const dtExpr = (col) => `CASE
  WHEN trim(COALESCE(${col}, '')) LIKE '%Z' THEN datetime(${col}, 'localtime')
  ELSE datetime(replace(substr(COALESCE(${col}, ''), 1, 19), 'T', ' '))
END`;

const normalizeToSqliteDateTime = (value) => {
  if (!value) return null;
  const raw = String(value).trim();
  const date = new Date(raw);
  if (!Number.isNaN(date.getTime())) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }
  return raw.slice(0, 19).replace('T', ' ');
};

const hasPermissionKey = (req, key) => {
  let perms = [];
  try {
    perms = typeof req.user?.permissions === 'string'
      ? JSON.parse(req.user.permissions)
      : (req.user?.permissions || []);
  } catch {
    perms = [];
  }
  return Array.isArray(perms) && perms.includes(key);
};

// Manual-entry gate:
// - Superadmin selalu boleh
// - Admin/Subadmin hanya jika checklist permission "manual_entry" aktif
const requireManualEntry = (req, res, next) => {
  if (req.user?.role === 'superadmin') return next();
  if (hasPermissionKey(req, 'manual_entry')) return next();
  return res.status(403).json({
    success: false,
    error: 'Akses ditolak. Fitur input manual hanya untuk Superadmin atau admin yang diberi akses.',
  });
};

const hasUnitConflict = async ({ unitId, orderId, startDate, endDate, bufferMinutes = 0 }) => {
  const buf = Number.isFinite(Number(bufferMinutes)) ? Number(bufferMinutes) : 0;
  const startNorm = normalizeToSqliteDateTime(startDate);
  const endNorm = normalizeToSqliteDateTime(endDate);
  if (!startNorm || !endNorm) return false;

  const row = await dbGet(
    `
    SELECT order_id
    FROM bookings
    WHERE unit_id = ?
      AND item_type = 'motor'
      AND order_id != ?
      AND status NOT IN ('cancelled', 'completed', 'selesai')
      AND ${dtExpr('start_date')} < datetime(?, ?)
      AND ${dtExpr('end_date')}   > datetime(?, ?)
    LIMIT 1
    `,
    [
      unitId,
      orderId,
      endNorm,
      buf > 0 ? `+${buf} minutes` : '+0 minutes',
      startNorm,
      buf > 0 ? `-${buf} minutes` : '+0 minutes',
    ]
  );
  return !!row;
};


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

    // Legacy SQLite rows can contain formatted strings like "Rp 87.500" instead of clean integers.
    // Normalize them before SUM/COUNT logic so dashboard stays reliable after import/restore.
    const sqlMoney = (columnName) => `
      CAST(
        COALESCE(
          NULLIF(
            REPLACE(
              REPLACE(
                REPLACE(
                  REPLACE(
                    REPLACE(TRIM(COALESCE(${columnName}, '0')), 'Rp', ''),
                  'rp', ''),
                '.', ''),
              ',', ''),
            ' ', ''),
          ''),
        '0')
      AS INTEGER)
    `;

    // Use created_at if available; fallback to start_date for older rows
    // Note: some historical rows store start_date as ISO (e.g. 2026-04-22T02:00:00.000Z) which SQLite can't always parse.
    // We normalize to "YYYY-MM-DD HH:MM:SS" (first 19 chars) when falling back to start_date.
    const startDateExpr = `datetime(replace(substr(COALESCE(start_date, ''), 1, 19), 'T', ' '))`;
    const tsExpr = `datetime(COALESCE(created_at, ${startDateExpr}))`;

    const basePriceExpr = sqlMoney('base_price');
    const discountExpr = sqlMoney('discount_amount');
    const serviceFeeExpr = sqlMoney('service_fee');
    const extendFeeExpr = sqlMoney('extend_fee');
    const addonFeeExpr = sqlMoney('addon_fee');
    const deliveryFeeExpr = sqlMoney('delivery_fee');
    const pickupFeeExpr = sqlMoney('pickup_fee');
    const dropFeeExpr = sqlMoney('drop_fee');
    const paidAmountExpr = sqlMoney('paid_amount');
    const totalPriceExpr = sqlMoney('total_price');

    // Robust booking total: prefer calculated breakdown when available, fallback to stored total_price.
    // This protects the dashboard if legacy rows have total_price = 0 or inconsistent.
    const calcTotalExpr = `
      (
        (${basePriceExpr} - ${discountExpr}) +
        ${serviceFeeExpr} + ${extendFeeExpr} + ${addonFeeExpr} + ${deliveryFeeExpr} +
        ${pickupFeeExpr} + ${dropFeeExpr}
      )
    `;
    const bookingTotalExpr = `
      CASE
        WHEN ${calcTotalExpr} > 0 THEN ${calcTotalExpr}
        ELSE ${totalPriceExpr}
      END
    `;

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
        `SELECT COALESCE(SUM(
           CASE
             WHEN payment_status = 'paid' THEN (
               CASE
                 WHEN ${paidAmountExpr} > 0 THEN ${paidAmountExpr}
                 ELSE ${bookingTotalExpr}
               END
             )
             ELSE 0
           END
         ), 0) as total
         FROM bookings
         WHERE status != 'cancelled' AND ${timeWhere}`
      ),
      dbGet(
        `SELECT COALESCE(SUM(${bookingTotalExpr}), 0) as total
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
                 ${bookingTotalExpr} - ${paidAmountExpr}
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
// OPS "TODAY" BOARD (Akses: dashboard)
// ==========================================
router.get('/ops/today', requirePermission('dashboard'), async (req, res) => {
  try {
    const startOfDay = `datetime('now','localtime','start of day')`;
    const endOfDay = `datetime('now','localtime','start of day','+1 day')`;
    const now = `datetime('now','localtime')`;

    const pickupsToday = await dbAll(
      `
      SELECT order_id, user_id, item_type, item_name, location, start_date, end_date,
             status, payment_status, unit_id, plate_number, created_at
      FROM bookings
      WHERE status != 'cancelled'
        AND ${dtExpr('start_date')} >= ${startOfDay}
        AND ${dtExpr('start_date')} <  ${endOfDay}
      ORDER BY ${dtExpr('start_date')} ASC
      `
    );

    const returnsToday = await dbAll(
      `
      SELECT order_id, user_id, item_type, item_name, location, start_date, end_date,
             status, payment_status, unit_id, plate_number, created_at
      FROM bookings
      WHERE status != 'cancelled'
        AND ${dtExpr('end_date')} >= ${startOfDay}
        AND ${dtExpr('end_date')} <  ${endOfDay}
      ORDER BY ${dtExpr('end_date')} ASC
      `
    );

    const newBookingsToday = await dbAll(
      `
      SELECT order_id, user_id, item_type, item_name, location, start_date, end_date,
             status, payment_status, unit_id, plate_number, created_at
      FROM bookings
      WHERE status != 'cancelled'
        AND datetime(COALESCE(created_at, '1970-01-01')) >= ${startOfDay}
      ORDER BY datetime(COALESCE(created_at, '1970-01-01')) DESC
      `
    );

    const overdue = await dbAll(
      `
      SELECT order_id, user_id, item_type, item_name, location, start_date, end_date,
             status, payment_status, unit_id, plate_number, created_at
      FROM bookings
      WHERE status = 'active'
        AND ${dtExpr('end_date')} < ${now}
      ORDER BY ${dtExpr('end_date')} ASC
      `
    );

    const preparing = await dbAll(
      `
      SELECT order_id, user_id, item_type, item_name, location, start_date, end_date,
             status, payment_status, unit_id, plate_number, created_at
      FROM bookings
      WHERE status = 'pending'
        AND status != 'cancelled'
        AND (payment_status = 'paid' OR IFNULL(paid_amount, 0) > 0)
      ORDER BY datetime(COALESCE(created_at, '1970-01-01')) DESC
      `
    );

    res.json({
      success: true,
      data: {
        counts: {
          pickups_today: pickupsToday.length,
          returns_today: returnsToday.length,
          new_bookings_today: newBookingsToday.length,
          overdue: overdue.length,
          preparing: preparing.length,
        },
        pickupsToday,
        returnsToday,
        newBookingsToday,
        overdue,
        preparing,
      },
    });
  } catch (err) {
    console.error('GET /admin/ops/today error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil data operasional hari ini.' });
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
// USERS: DELETE / ANONYMIZE (Akses: users)
// Catatan: Karena foreign_keys=ON dan banyak tabel mereferensikan users(id),
// "hapus" dilakukan sebagai anonimisasi + pemutusan akses login.
// ==========================================
router.delete('/users/:id', requirePermission('users'), async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    if (!id) return res.status(400).json({ success: false, error: 'User ID tidak valid.' });

    const user = await dbGet(`SELECT id, role, email FROM users WHERE id = ?`, [id]);
    if (!user) return res.status(404).json({ success: false, error: 'User tidak ditemukan.' });
    if (user.role !== 'user') {
      return res.status(403).json({ success: false, error: 'Hanya akun pelanggan yang bisa dihapus.' });
    }

    const deletedDomain = '@brothertrans.invalid';
    const isAlreadyAnonymized = String(user.email || '').toLowerCase().endsWith(deletedDomain);
    if (isAlreadyAnonymized) {
      return res.json({ success: true, mode: 'already_anonymized', message: 'Data pelanggan sudah terhapus.' });
    }

    const tag = crypto.createHash('sha256').update(id).digest('hex').slice(0, 12);
    const newEmail = `deleted+${tag}${deletedDomain}`;

    const randPhone = crypto.randomInt
      ? String(crypto.randomInt(0, 1_000_000_000_000)).padStart(12, '0')
      : String(parseInt(crypto.randomBytes(6).toString('hex'), 16) % 1_000_000_000_000).padStart(12, '0');
    const newPhone = `000${randPhone}`.slice(0, 14);

    const randomPassword = crypto.randomBytes(32).toString('hex');
    const hashedPassword = await bcrypt.hash(randomPassword, 10);

    await dbRun(
      `
      UPDATE users
      SET
        name = ?,
        email = ?,
        phone = ?,
        password = ?,
        ktp_id = NULL,
        kyc_status = 'unverified',
        kyc_code = NULL,
        referral_code = NULL,
        referred_by = NULL,
        reset_token = NULL,
        reset_token_expiry = NULL,
        bank_account = NULL,
        bank_name = NULL,
        profile_picture = NULL,
        profile_banner = NULL,
        login_attempts = 0,
        locked_until = NULL,
        last_login = NULL
      WHERE id = ?
      `,
      ['Deleted User', newEmail, newPhone, hashedPassword, id]
    );

    // Cleanup data yang sifatnya sensitif (IP/user_agent/token hash) dan tidak dibutuhkan untuk operasional
    await dbRun(`DELETE FROM login_logs WHERE user_id = ?`, [id]);
    await dbRun(`DELETE FROM token_blacklist WHERE user_id = ?`, [id]);
    await dbRun(`DELETE FROM promo_usage WHERE user_id = ?`, [id]);

    res.json({ success: true, mode: 'anonymized', message: 'Data pelanggan berhasil dihapus (dianonimkan).' });
  } catch (err) {
    console.error('DELETE /admin/users/:id error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal menghapus data pelanggan.' });
  }
});

// ==========================================
// MOTOR UNITS — ALL (untuk FleetInventoryTable)
// [FIX P8] Endpoint baru — ambil semua unit beserta nama motor & kategori
// ==========================================
// View-only access: staff operasional (logistics) boleh lihat unit untuk Fleet Inventory.
router.get('/motor-units-all', requireAnyPermission(['armada', 'logistics']), async (req, res) => {
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
// UNITS (Akses: booking) — untuk assign unit tanpa perlu permission armada
// ==========================================
router.get('/units', requirePermission('booking'), async (req, res) => {
  try {
    const motorName = req.query.motor_name ? String(req.query.motor_name).trim() : null;
    const params = [];
    const where = motorName ? 'WHERE m.name = ?' : '';
    if (motorName) params.push(motorName);

    const rows = await dbAll(
      `
      SELECT mu.id, mu.motor_id, mu.plate_number, mu.status, mu.condition_notes,
             m.name AS motor_name, m.category AS motor_category
      FROM motor_units mu
      JOIN motors m ON mu.motor_id = m.id
      ${where}
      ORDER BY m.category ASC, m.name ASC, mu.plate_number ASC
      `,
      params
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /admin/units error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil data unit.' });
  }
});

// ==========================================
// UNIT AVAILABILITY (Akses: booking)
// Query: start_date, end_date, motor_name (optional)
// ==========================================
router.get('/units/available', requirePermission('booking'), async (req, res) => {
  try {
    const startDate = normalizeToSqliteDateTime(req.query.start_date || req.query.start || '');
    const endDate = normalizeToSqliteDateTime(req.query.end_date || req.query.end || '');
    const motorName = req.query.motor_name ? String(req.query.motor_name).trim() : null;
    const bufferMinutes = parseInt(process.env.UNIT_TURNAROUND_MINUTES || '0', 10) || 0;

    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, error: 'start_date dan end_date wajib diisi.' });
    }

    const params = [
      endDate,
      bufferMinutes > 0 ? `+${bufferMinutes} minutes` : '+0 minutes',
      startDate,
      bufferMinutes > 0 ? `-${bufferMinutes} minutes` : '+0 minutes',
      endDate,
      bufferMinutes > 0 ? `+${bufferMinutes} minutes` : '+0 minutes',
      startDate,
      bufferMinutes > 0 ? `-${bufferMinutes} minutes` : '+0 minutes',
    ];

    let motorWhere = '';
    if (motorName) {
      motorWhere = 'AND m.name = ?';
      params.push(motorName);
    }

    const rows = await dbAll(
      `
      SELECT mu.id, mu.plate_number, mu.status,
             m.name AS motor_name, m.category AS motor_category
      FROM motor_units mu
      JOIN motors m ON mu.motor_id = m.id
      WHERE mu.status != 'OUT'
        ${motorWhere}
        AND mu.id NOT IN (
      SELECT b.unit_id
      FROM bookings b
      WHERE b.unit_id IS NOT NULL
        AND b.item_type = 'motor'
        AND b.status NOT IN ('cancelled', 'completed', 'selesai')
        AND ${dtExpr('b.start_date')} < datetime(?, ?)
        AND ${dtExpr('b.end_date')}   > datetime(?, ?)
    )
        AND mu.id NOT IN (
          SELECT ub.unit_id
          FROM unit_blocks ub
          WHERE datetime(ub.start_at) < datetime(?, ?)
            AND datetime(ub.end_at)   > datetime(?, ?)
        )
      ORDER BY m.category ASC, m.name ASC, mu.plate_number ASC
      `,
      params
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /admin/units/available error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil ketersediaan unit.' });
  }
});

// ==========================================
// UNIT BLOCKS (Akses: booking)
// ==========================================
router.post('/units/blocks', requireAdminRole, async (req, res) => {
  try {
    const unitId = parseInt(req.body?.unit_id, 10);
    const startAt = normalizeToSqliteDateTime(req.body?.start_at);
    const endAt = normalizeToSqliteDateTime(req.body?.end_at);
    const reason = req.body?.reason ? String(req.body.reason).trim().slice(0, 500) : null;
    const blockType = req.body?.block_type ? String(req.body.block_type).trim().slice(0, 40) : null;
    const customerName = req.body?.customer_name ? String(req.body.customer_name).trim().slice(0, 120) : null;
    const customerPhone = req.body?.customer_phone ? String(req.body.customer_phone).trim().slice(0, 40) : null;
    const notes = req.body?.notes ? String(req.body.notes).trim().slice(0, 800) : null;

    if (!unitId || !startAt || !endAt) {
      return res.status(400).json({ success: false, error: 'unit_id, start_at, end_at wajib diisi.' });
    }

    await dbRun(
      `INSERT INTO unit_blocks (unit_id, start_at, end_at, reason, block_type, customer_name, customer_phone, notes, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [unitId, startAt, endAt, reason, blockType, customerName, customerPhone, notes, req.user?.id || null]
    );

    res.status(201).json({ success: true, message: 'Blokir unit berhasil dibuat.' });
  } catch (err) {
    console.error('POST /admin/units/blocks error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal membuat blokir unit.' });
  }
});

// View-only: staff operasional boleh lihat (armada), tapi hanya admin yang bisa create/edit/delete.
router.get('/units/blocks', requireAnyPermission(['booking', 'armada', 'logistics']), async (req, res) => {
  try {
    const unitId = req.query.unit_id ? parseInt(req.query.unit_id, 10) : null;
    const start = normalizeToSqliteDateTime(req.query.start || req.query.start_at || '');
    const end = normalizeToSqliteDateTime(req.query.end || req.query.end_at || '');

    const where = [];
    const params = [];

    if (unitId) {
      where.push('unit_id = ?');
      params.push(unitId);
    }

    // Optional range filter
    if (start && end) {
      where.push(`datetime(start_at) < datetime(?)`);
      where.push(`datetime(end_at) > datetime(?)`);
      params.push(end, start);
    }

    const rows = await dbAll(
      `
      SELECT id, unit_id, start_at, end_at, reason, block_type, customer_name, customer_phone, notes, created_by, created_at
      FROM unit_blocks
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY datetime(start_at) ASC
      `,
      params
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /admin/units/blocks error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil blokir unit.' });
  }
});

router.put('/units/blocks/:id', requireAdminRole, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ success: false, error: 'ID blokir tidak valid.' });

    const startAt = normalizeToSqliteDateTime(req.body?.start_at);
    const endAt = normalizeToSqliteDateTime(req.body?.end_at);
    const reason = req.body?.reason ? String(req.body.reason).trim().slice(0, 500) : null;
    const blockType = req.body?.block_type ? String(req.body.block_type).trim().slice(0, 40) : null;
    const customerName = req.body?.customer_name ? String(req.body.customer_name).trim().slice(0, 120) : null;
    const customerPhone = req.body?.customer_phone ? String(req.body.customer_phone).trim().slice(0, 40) : null;
    const notes = req.body?.notes ? String(req.body.notes).trim().slice(0, 800) : null;

    if (!startAt || !endAt) {
      return res.status(400).json({ success: false, error: 'start_at dan end_at wajib diisi.' });
    }

    const existing = await dbGet(`SELECT id FROM unit_blocks WHERE id = ?`, [id]);
    if (!existing) return res.status(404).json({ success: false, error: 'Blokir tidak ditemukan.' });

    await dbRun(
      `UPDATE unit_blocks
       SET start_at = ?, end_at = ?, reason = ?, block_type = ?, customer_name = ?, customer_phone = ?, notes = ?
       WHERE id = ?`,
      [startAt, endAt, reason, blockType, customerName, customerPhone, notes, id]
    );

    res.json({ success: true, message: 'Blokir unit berhasil diperbarui.' });
  } catch (err) {
    console.error('PUT /admin/units/blocks/:id error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal memperbarui blokir unit.' });
  }
});

router.delete('/units/blocks/:id', requireAdminRole, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ success: false, error: 'ID blokir tidak valid.' });
    await dbRun(`DELETE FROM unit_blocks WHERE id = ?`, [id]);
    res.json({ success: true, message: 'Blokir unit berhasil dihapus.' });
  } catch (err) {
    console.error('DELETE /admin/units/blocks/:id error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal menghapus blokir unit.' });
  }
});

// ==========================================
// AUDIT LOGS (Akses: settings)
// ==========================================
router.get('/audit-logs', requirePermission('settings'), async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '50', 10) || 50, 200);
    const rows = await dbAll(
      `SELECT id, admin_id, admin_role, action, method, path, status_code, ip_address, created_at, context
       FROM admin_audit_logs
       ORDER BY id DESC
       LIMIT ?`,
      [limit]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /admin/audit-logs error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil audit logs.' });
  }
});

// ==========================================
// SUPPORT TICKETS (Akses: settings)
// ==========================================
router.get('/support/tickets', requirePermission('settings'), async (req, res) => {
  try {
    const rows = await dbAll(
      `SELECT
         st.id,
         st.ticket_number,
         st.user_id,
         st.order_id,
         st.subject,
         st.message,
         CASE
           WHEN st.status IN ('open', 'pending', '') OR st.status IS NULL THEN 'pending'
           WHEN st.status IN ('done', 'closed', 'resolved', 'completed') THEN 'completed'
           ELSE st.status
         END AS status,
         st.created_at,
         COALESCE(u.name, 'Pelanggan') AS user_name,
         u.phone AS user_phone,
         u.email AS user_email
       FROM support_tickets st
       LEFT JOIN users u ON u.id = st.user_id
       ORDER BY datetime(st.created_at) DESC, st.id DESC`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /admin/support/tickets error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil data tiket bantuan.' });
  }
});

router.put('/support/tickets/:id/status', requirePermission('settings'), async (req, res) => {
  try {
    const { status } = req.body || {};
    if (!['pending', 'completed'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Status tiket tidak valid.' });
    }

    const result = await dbRun(
      `UPDATE support_tickets SET status = ? WHERE id = ?`,
      [status, req.params.id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Tiket bantuan tidak ditemukan.' });
    }

    res.json({ success: true, message: 'Status tiket bantuan berhasil diperbarui.' });
  } catch (err) {
    console.error('PUT /admin/support/tickets/:id/status error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal memperbarui status tiket bantuan.' });
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
    const {
      name,
      display_name,
      cc,
      category,
      location,
      price_12h,
      base_price,
      image_url,
      allow_dynamic_pricing,
    } = req.body || {};

    if (!name || !category || !base_price) {
      return res.status(400).json({ success: false, error: 'Nama, kategori, dan harga dasar wajib diisi.' });
    }

    const isDynamic = (allow_dynamic_pricing === false || allow_dynamic_pricing === 0 || allow_dynamic_pricing === '0') ? 0 : 1;
    const internalName = name.trim();
    const publicName = String(display_name || name || '').trim() || internalName;

    // 2. Tambahkan cc ke query INSERT
    const result = await dbRun(
      `INSERT INTO motors (name, display_name, cc, category, location, price_12h, base_price, stock, image_url, allow_dynamic_pricing) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [internalName, publicName, cc === 'Listrik' ? 'Listrik' : (parseInt(cc) || 125), category, location || 'Lempuyangan', parseInt(price_12h) || 0, parseInt(base_price), image_url || null, isDynamic]
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
    const {
      name,
      display_name,
      cc,
      category,
      location,
      price_12h,
      base_price,
      image_url,
      allow_dynamic_pricing,
    } = req.body || {};

    if (!name || !category || !base_price) {
      return res.status(400).json({ success: false, error: 'Nama, kategori, dan harga dasar wajib diisi.' });
    }

    const isDynamic = (allow_dynamic_pricing === false || allow_dynamic_pricing === 0 || allow_dynamic_pricing === '0') ? 0 : 1;
    const internalName = name.trim();
    const publicName = String(display_name || name || '').trim() || internalName;

    // 2. Tambahkan cc=? ke query UPDATE
    await dbRun(
      `UPDATE motors SET name=?, display_name=?, cc=?, category=?, location=?, price_12h=?, base_price=?, image_url=?, allow_dynamic_pricing=? WHERE id=?`,
      [internalName, publicName, cc === 'Listrik' ? 'Listrik' : (parseInt(cc) || 125), category, location, parseInt(price_12h) || 0, parseInt(base_price), image_url, isDynamic, req.params.id]
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
// MOTOR ADD-ONS & PAKET (Akses: booking)
// ==========================================
router.get('/motor-addons', requirePermission('booking'), async (req, res) => {
  try {
    const rows = await dbAll(
      `SELECT id, name, description, price, addon_type, allow_quantity, max_qty, sort_order, is_active, created_at
       FROM motor_addons
       ORDER BY
         CASE addon_type WHEN 'package' THEN 0 ELSE 1 END,
         sort_order ASC,
         id ASC`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /admin/motor-addons error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil data add-on.' });
  }
});

router.post('/motor-addons', requirePermission('booking'), async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      addon_type = 'addon',
      allow_quantity = 0,
      max_qty = 1,
      sort_order = 0,
      is_active = 1,
    } = req.body || {};

    if (!name || price === undefined || price === null || String(name).trim().length < 2) {
      return res.status(400).json({ success: false, error: 'Nama dan harga add-on wajib diisi.' });
    }
    if (!['addon', 'package'].includes(addon_type)) {
      return res.status(400).json({ success: false, error: 'Tipe add-on tidak valid.' });
    }

    const p = Math.max(0, parseInt(price, 10) || 0);
    const allowQty = (allow_quantity === true || allow_quantity === 1 || allow_quantity === '1') ? 1 : 0;
    const maxQty = allowQty ? Math.max(1, parseInt(max_qty, 10) || 1) : 1;
    const sort = parseInt(sort_order, 10) || 0;
    const active = (is_active === false || is_active === 0 || is_active === '0') ? 0 : 1;

    const result = await dbRun(
      `INSERT INTO motor_addons (name, description, price, addon_type, allow_quantity, max_qty, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [String(name).trim(), description || null, p, addon_type, allowQty, maxQty, sort, active]
    );
    res.status(201).json({ success: true, message: 'Add-on berhasil ditambahkan.', id: result.lastID });
  } catch (err) {
    console.error('POST /admin/motor-addons error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal menambahkan add-on.' });
  }
});

router.put('/motor-addons/:id', requirePermission('booking'), async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      addon_type,
      allow_quantity,
      max_qty,
      sort_order,
      is_active,
    } = req.body || {};

    if (!name || price === undefined || price === null || String(name).trim().length < 2) {
      return res.status(400).json({ success: false, error: 'Nama dan harga add-on wajib diisi.' });
    }
    if (!['addon', 'package'].includes(addon_type)) {
      return res.status(400).json({ success: false, error: 'Tipe add-on tidak valid.' });
    }

    const p = Math.max(0, parseInt(price, 10) || 0);
    const allowQty = (allow_quantity === true || allow_quantity === 1 || allow_quantity === '1') ? 1 : 0;
    const maxQty = allowQty ? Math.max(1, parseInt(max_qty, 10) || 1) : 1;
    const sort = parseInt(sort_order, 10) || 0;
    const active = (is_active === false || is_active === 0 || is_active === '0') ? 0 : 1;

    const result = await dbRun(
      `UPDATE motor_addons
       SET name = ?, description = ?, price = ?, addon_type = ?, allow_quantity = ?, max_qty = ?, sort_order = ?, is_active = ?
       WHERE id = ?`,
      [String(name).trim(), description || null, p, addon_type, allowQty, maxQty, sort, active, req.params.id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Add-on tidak ditemukan.' });
    }

    res.json({ success: true, message: 'Add-on berhasil diperbarui.' });
  } catch (err) {
    console.error('PUT /admin/motor-addons/:id error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal memperbarui add-on.' });
  }
});

router.delete('/motor-addons/:id', requirePermission('booking'), async (req, res) => {
  try {
    const result = await dbRun(`DELETE FROM motor_addons WHERE id = ?`, [req.params.id]);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Add-on tidak ditemukan.' });
    }
    res.json({ success: true, message: 'Add-on berhasil dihapus.' });
  } catch (err) {
    console.error('DELETE /admin/motor-addons/:id error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal menghapus add-on.' });
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
// ARMADA MOBIL (Akses: armada)
// ==========================================
router.get('/cars', requirePermission('armada'), async (req, res) => {
  try {
    const rows = await dbAll(
      `
      SELECT c.*,
             (SELECT COUNT(*) FROM car_units cu WHERE cu.car_id = c.id AND cu.status = 'RDY') as active_stock,
             (SELECT COUNT(*) FROM car_units cu WHERE cu.car_id = c.id) as total_units
      FROM cars c
      ORDER BY c.id DESC
      `
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /admin/cars error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil data mobil.' });
  }
});

router.post('/cars', requirePermission('armada'), async (req, res) => {
  try {
    const {
      name,
      display_name,
      category,
      seats,
      transmission,
      base_price,
      image_url,
      description,
    } = req.body || {};

    if (!name || !base_price) {
      return res.status(400).json({ success: false, error: 'Nama dan harga wajib diisi.' });
    }

    const internalName = String(name).trim();
    const publicName = String(display_name || name || '').trim() || internalName;

    const result = await dbRun(
      `INSERT INTO cars (name, display_name, category, seats, transmission, base_price, image_url, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        internalName,
        publicName,
        category || 'Car',
        parseInt(seats, 10) || 5,
        String(transmission || 'AT').toUpperCase(),
        parseInt(base_price, 10) || 0,
        image_url || null,
        description || null,
      ]
    );

    res.status(201).json({ success: true, message: 'Katalog mobil ditambahkan.', id: result.lastID });
  } catch (err) {
    console.error('POST /admin/cars error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal menambahkan mobil.' });
  }
});

router.put('/cars/:id', requirePermission('armada'), async (req, res) => {
  try {
    const {
      name,
      display_name,
      category,
      seats,
      transmission,
      base_price,
      image_url,
      description,
    } = req.body || {};

    if (!name || !base_price) {
      return res.status(400).json({ success: false, error: 'Nama dan harga wajib diisi.' });
    }

    const internalName = String(name).trim();
    const publicName = String(display_name || name || '').trim() || internalName;

    const result = await dbRun(
      `UPDATE cars
       SET name = ?, display_name = ?, category = ?, seats = ?, transmission = ?, base_price = ?, image_url = ?, description = ?
       WHERE id = ?`,
      [
        internalName,
        publicName,
        category || 'Car',
        parseInt(seats, 10) || 5,
        String(transmission || 'AT').toUpperCase(),
        parseInt(base_price, 10) || 0,
        image_url || null,
        description || null,
        req.params.id,
      ]
    );

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Mobil tidak ditemukan.' });
    }
    res.json({ success: true, message: 'Katalog mobil diperbarui.' });
  } catch (err) {
    console.error('PUT /admin/cars/:id error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal memperbarui mobil.' });
  }
});

router.delete('/cars/:id', requirePermission('armada'), async (req, res) => {
  try {
    const result = await dbRun(`DELETE FROM cars WHERE id = ?`, [req.params.id]);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Mobil tidak ditemukan.' });
    }
    res.json({ success: true, message: 'Katalog mobil dihapus.' });
  } catch (err) {
    console.error('DELETE /admin/cars/:id error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal menghapus mobil.' });
  }
});

router.get('/cars/:id/units', requirePermission('armada'), async (req, res) => {
  try {
    const rows = await dbAll(`SELECT * FROM car_units WHERE car_id = ? ORDER BY id DESC`, [req.params.id]);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /admin/cars/:id/units error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil data unit mobil.' });
  }
});

router.post('/cars/:id/units', requirePermission('armada'), async (req, res) => {
  try {
    const { plate_number, status, current_location, condition_notes } = req.body || {};
    if (!plate_number || String(plate_number).trim().length < 3) {
      return res.status(400).json({ success: false, error: 'Plat nomor wajib diisi (minimal 3 karakter).' });
    }

    const validStatuses = ['RDY', 'RNT', 'DRT', 'MNT'];
    const unitStatus = validStatuses.includes(String(status || '').toUpperCase())
      ? String(status).toUpperCase()
      : 'RDY';

    const result = await dbRun(
      `INSERT INTO car_units (car_id, plate_number, status, current_location, condition_notes)
       VALUES (?, ?, ?, ?, ?)`,
      [
        req.params.id,
        String(plate_number).trim().toUpperCase(),
        unitStatus,
        current_location || 'Yogyakarta',
        condition_notes || null,
      ]
    );

    res.status(201).json({ success: true, message: 'Unit mobil ditambahkan.', id: result.lastID });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint')) {
      return res.status(409).json({ success: false, error: 'Plat nomor sudah terdaftar.' });
    }
    console.error('POST /admin/cars/:id/units error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal menambahkan unit mobil.' });
  }
});

router.put('/car-units/:unitId', requirePermission('armada'), async (req, res) => {
  try {
    const { plate_number, status, current_location, condition_notes } = req.body || {};
    if (!plate_number) {
      return res.status(400).json({ success: false, error: 'Plat nomor wajib diisi.' });
    }

    const validStatuses = ['RDY', 'RNT', 'DRT', 'MNT'];
    const unitStatus = validStatuses.includes(String(status || '').toUpperCase())
      ? String(status).toUpperCase()
      : 'RDY';

    const result = await dbRun(
      `UPDATE car_units
       SET plate_number = ?, status = ?, current_location = ?, condition_notes = ?
       WHERE id = ?`,
      [
        String(plate_number).trim().toUpperCase(),
        unitStatus,
        current_location || 'Yogyakarta',
        condition_notes || null,
        req.params.unitId,
      ]
    );

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Unit mobil tidak ditemukan.' });
    }
    res.json({ success: true, message: 'Unit mobil berhasil diperbarui.' });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint')) {
      return res.status(409).json({ success: false, error: 'Plat nomor sudah digunakan unit lain.' });
    }
    console.error('PUT /admin/car-units/:unitId error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal memperbarui unit mobil.' });
  }
});

router.delete('/car-units/:unitId', requirePermission('armada'), async (req, res) => {
  try {
    const result = await dbRun(`DELETE FROM car_units WHERE id = ?`, [req.params.unitId]);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Unit mobil tidak ditemukan.' });
    }
    res.json({ success: true, message: 'Unit mobil berhasil dihapus.' });
  } catch (err) {
    console.error('DELETE /admin/car-units/:unitId error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal menghapus unit mobil.' });
  }
});

// ==========================================
// TRANSAKSI & BOOKING (Akses: booking)
// ==========================================
// View-only: armada boleh lihat list booking untuk Fleet Inventory.
// View-only access: staff operasional (logistics) butuh lihat booking motor untuk Fleet Inventory & operasional.
router.get('/bookings', requireAnyPermission(['booking', 'armada', 'logistics']), async (req, res) => {
  try {
    const itemType = req.query.item_type ? String(req.query.item_type).trim().toLowerCase() : null;
    const start = normalizeToSqliteDateTime(req.query.start || req.query.start_at || '');
    const end = normalizeToSqliteDateTime(req.query.end || req.query.end_at || '');

    const where = [];
    const params = [];

    if (itemType && ['motor', 'locker', 'car'].includes(itemType)) {
      where.push(`lower(COALESCE(b.item_type, '')) = ?`);
      params.push(itemType);
    }

    // Optional range filter (overlap)
    if (start && end) {
      where.push(`${dtExpr('b.start_date')} < datetime(?)`);
      where.push(`${dtExpr('b.end_date')}   > datetime(?)`);
      params.push(end, start);
    }

    const rows = await dbAll(
      `
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
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY ${dtExpr('b.start_date')} DESC
      `,
      params
    );
    
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

// ==========================================
// MANUAL ENTRY (Akses: booking/users)
// - Buat user manual (email_verified + KYC settled)
// - Buat booking manual (motor/mobil/loker)
// ==========================================
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
const normalizePhone = (phone) => String(phone || '').trim();
const makeUserId = () => `USR-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;

const makeTempPassword = () =>
  crypto.randomBytes(6).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 10) || 'TempPass123';

const makeOrderId = (prefix) => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `${prefix}-${y}${m}${d}-${rand}`;
};

router.get('/manual/catalogs', requireManualEntry, async (req, res) => {
  try {
    const motors = await dbAll(
      `SELECT id, name, COALESCE(display_name, name) as display_name, location, base_price, price_12h
       FROM motors
       ORDER BY id DESC`
    );
    const cars = await dbAll(
      `SELECT id, name, COALESCE(display_name, name) as display_name, base_price
       FROM cars
       ORDER BY id DESC`
    );
    const lockers = await dbAll(
      `SELECT id, type, location, stock, price_1h, price_12h, price_24h
       FROM lockers
       ORDER BY id DESC`
    );
    res.json({ success: true, data: { motors, cars, lockers, locker_min_hours: LOCKER_MIN_HOURS } });
  } catch (err) {
    console.error('GET /admin/manual/catalogs error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil data katalog.' });
  }
});

router.post('/manual/users', requireManualEntry, async (req, res) => {
  try {
    const raw = req.body || {};
    const name = String(raw.name || '').trim();
    const phone = normalizePhone(raw.phone || '');
    const location = String(raw.location || 'Lainnya').trim() || 'Lainnya';
    const ktpId = raw.ktp_id ? String(raw.ktp_id).trim() : null;
    const resetPassword = raw.reset_password !== false;

    if (!name || name.length < 2) {
      return res.status(400).json({ success: false, error: 'Nama wajib diisi (min 2 karakter).' });
    }
    if (!phone) {
      return res.status(400).json({ success: false, error: 'No HP wajib diisi.' });
    }

    let email = raw.email ? String(raw.email).trim().toLowerCase() : '';
    if (email && !isValidEmail(email)) {
      return res.status(400).json({ success: false, error: 'Format email tidak valid.' });
    }
    if (!email) {
      const digits = String(phone).replace(/\D/g, '') || crypto.randomBytes(3).toString('hex');
      email = `guest.${digits}@brothertrans.local`;
    }

    const existing = await dbGet(`SELECT id, email, role FROM users WHERE lower(email) = lower(?) LIMIT 1`, [email]).catch(() => null);
    const tempPassword = resetPassword ? makeTempPassword() : null;
    const hashedPassword = resetPassword ? await bcrypt.hash(tempPassword, 10) : null;

    if (existing) {
      // Update existing customer (keep role if already admin/vendor)
      const isCustomerRole = !existing.role || String(existing.role).toLowerCase() === 'user';
      const fields = [];
      const params = [];

      fields.push('name = ?'); params.push(name);
      fields.push('phone = ?'); params.push(phone);
      fields.push('location = ?'); params.push(location);
      if (ktpId) { fields.push('ktp_id = ?'); params.push(ktpId); }
      if (hashedPassword) { fields.push('password = ?'); params.push(hashedPassword); }
      fields.push('email_verified = 1');
      // user manual = KYC settled
      fields.push(`kyc_status = 'verified'`);

      if (isCustomerRole) {
        await dbRun(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, [...params, existing.id]);
      } else {
        // Jangan downgrade admin/vendor, tapi tetap set email_verified + profile.
        await dbRun(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, [...params, existing.id]);
      }

      const user = await dbGet(
        `SELECT id, name, email, phone, role, kyc_status, email_verified FROM users WHERE id = ? LIMIT 1`,
        [existing.id]
      );
      return res.json({
        success: true,
        message: 'User berhasil diperbarui.',
        data: { user, temp_password: tempPassword },
      });
    }

    const userId = makeUserId();
    const passwordToUse = hashedPassword || (await bcrypt.hash(makeTempPassword(), 10));
    await dbRun(
      `INSERT INTO users (id, name, email, password, phone, role, permissions, kyc_status, email_verified, location, ktp_id, join_date)
       VALUES (?, ?, ?, ?, ?, 'user', '[]', 'verified', 1, ?, ?, ?)`,
      [userId, name, email, passwordToUse, phone, location, ktpId, new Date().toISOString()]
    );

    const user = await dbGet(
      `SELECT id, name, email, phone, role, kyc_status, email_verified FROM users WHERE id = ? LIMIT 1`,
      [userId]
    );
    return res.status(201).json({
      success: true,
      message: 'User berhasil dibuat.',
      data: { user, temp_password: tempPassword },
    });
  } catch (err) {
    if (String(err.message || '').includes('UNIQUE constraint') || String(err.message || '').includes('unique')) {
      return res.status(409).json({ success: false, error: 'Email sudah digunakan.' });
    }
    console.error('POST /admin/manual/users error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal membuat user.' });
  }
});

router.post('/manual/bookings', requireManualEntry, async (req, res) => {
  try {
    const raw = req.body || {};
    const itemType = String(raw.item_type || '').trim().toLowerCase();
    const userId = String(raw.user_id || '').trim();
    const location = raw.location ? String(raw.location).trim() : null;
    const paymentStatus = String(raw.payment_status || 'paid').trim().toLowerCase();
    const paymentMethod = String(raw.payment_method || 'transfer').trim().toLowerCase();

    if (!userId) return res.status(400).json({ success: false, error: 'user_id wajib diisi.' });
    if (!['motor', 'car', 'locker'].includes(itemType)) {
      return res.status(400).json({ success: false, error: 'item_type tidak valid.' });
    }
    if (!['paid', 'unpaid'].includes(paymentStatus)) {
      return res.status(400).json({ success: false, error: 'payment_status tidak valid.' });
    }

    const userRow = await dbGet(`SELECT id, name, phone FROM users WHERE id = ? LIMIT 1`, [userId]).catch(() => null);
    if (!userRow) return res.status(404).json({ success: false, error: 'User tidak ditemukan.' });

    let orderId = raw.order_id ? String(raw.order_id).trim() : '';
    if (!orderId) {
      orderId = makeOrderId(itemType === 'motor' ? 'BTM' : itemType === 'car' ? 'BTC' : 'BTL');
    }

    const existing = await dbGet(`SELECT order_id FROM bookings WHERE order_id = ? LIMIT 1`, [orderId]).catch(() => null);
    if (existing) return res.status(409).json({ success: false, error: 'Order ID sudah digunakan.' });

    const ttlMinRaw = parseInt(process.env.BOOKING_PENDING_TTL_MINUTES || '180', 10);
    const ttlMin = Number.isFinite(ttlMinRaw) ? Math.max(5, Math.min(24 * 60, ttlMinRaw)) : 180;

    if (itemType === 'locker') {
      // NOTE: Untuk loker manual, disarankan payment_status=paid agar stok tidak "menggantung".
      const lockerId = parseInt(raw.locker_id, 10);
      const durationHours = parseInt(raw.duration_hours, 10);
      const startDateRaw = raw.start_date ? String(raw.start_date).trim() : '';
      if (!lockerId || !durationHours || !startDateRaw) {
        return res.status(400).json({ success: false, error: 'locker_id, duration_hours, start_date wajib diisi.' });
      }
      if (!location) {
        return res.status(400).json({ success: false, error: 'Lokasi loker wajib diisi.' });
      }

      const locker = await dbGet(
        `SELECT id, type, location, stock, price_1h, price_12h, price_24h FROM lockers WHERE id = ? LIMIT 1`,
        [lockerId]
      ).catch(() => null);
      if (!locker) return res.status(404).json({ success: false, error: 'Loker tidak ditemukan.' });
      if (Number(locker.stock) <= 0) return res.status(409).json({ success: false, error: 'Stok loker habis.' });

      const pricing = calculateLockerPrice(durationHours, locker.price_1h, locker.price_12h, locker.price_24h);
      if (!pricing.isValid) return res.status(400).json({ success: false, error: pricing.error });

      const pickupFee = Math.max(0, parseInt(raw.pickup_fee, 10) || 0);
      const dropFee = Math.max(0, parseInt(raw.drop_fee, 10) || 0);
      const totalPrice = pricing.total + pickupFee + dropFee;

      const startMs = new Date(startDateRaw).getTime();
      if (Number.isNaN(startMs)) return res.status(400).json({ success: false, error: 'Tanggal mulai tidak valid.' });
      const endDateIso = new Date(startMs + durationHours * 60 * 60 * 1000).toISOString();
      const itemName = raw.item_name ? String(raw.item_name).trim() : `Loker ${String(locker.type || '').trim()}`;

      await dbRun('BEGIN IMMEDIATE');
      try {
        const stockResult = await dbRun(
          `UPDATE lockers SET stock = stock - 1 WHERE id = ? AND stock > 0`,
          [lockerId]
        );
        if (!stockResult || stockResult.changes === 0) {
          const e = new Error('Stok loker habis. Silakan pilih loker lain.');
          e.statusCode = 409;
          throw e;
        }

        await dbRun(
          `INSERT INTO bookings (order_id, user_id, item_type, item_name, location, start_date, end_date,
           base_price, total_price, status, payment_status, payment_method, paid_amount, duration_hours, pickup_fee, drop_fee)
           VALUES (?, ?, 'locker', ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?)`,
          [
            orderId,
            userId,
            itemName,
            location,
            startDateRaw,
            endDateIso,
            pricing.total,
            totalPrice,
            paymentStatus,
            paymentMethod,
            paymentStatus === 'paid' ? totalPrice : 0,
            durationHours,
            pickupFee,
            dropFee,
          ]
        );

        if (paymentStatus === 'unpaid') {
          await dbRun(
            `UPDATE bookings
             SET expires_at = datetime('now', ?)
             WHERE order_id = ? AND status = 'pending' AND payment_status = 'unpaid'`,
            [`+${ttlMin} minutes`, orderId]
          ).catch(() => {});
        }

        await dbRun('COMMIT');
      } catch (e) {
        try { await dbRun('ROLLBACK'); } catch {}
        // best-effort revert stock
        await dbRun(`UPDATE lockers SET stock = stock + 1 WHERE id = ?`, [lockerId]).catch(() => {});
        throw e;
      }

      notifyNewBooking(
        {
          order_id: orderId,
          item_type: 'locker',
          item_name: itemName,
          location,
          start_date: startDateRaw,
          end_date: endDateIso,
          total_price: totalPrice,
          payment_method: paymentMethod,
        },
        userRow
      ).catch(() => {});

      return res.status(201).json({ success: true, message: 'Booking loker manual dibuat.', data: { order_id: orderId } });
    }

    // Motor / Car manual booking
    const startDateRaw = raw.start_date ? String(raw.start_date).trim() : '';
    const endDateRaw = raw.end_date ? String(raw.end_date).trim() : '';
    const totalPrice = Math.max(0, parseInt(raw.total_price, 10) || 0);
    const basePrice = Math.max(0, parseInt(raw.base_price, 10) || totalPrice);
    const serviceFee = Math.max(0, parseInt(raw.service_fee, 10) || 0);
    const addonFee = Math.max(0, parseInt(raw.addon_fee, 10) || 0);
    const deliveryFee = Math.max(0, parseInt(raw.delivery_fee, 10) || 0);
    const discountAmount = Math.max(0, parseInt(raw.discount_amount, 10) || 0);
    const durationHours = Math.max(1, parseInt(raw.duration_hours, 10) || 1);
    const tripScope = raw.trip_scope ? String(raw.trip_scope).trim() : 'local';
    const tripDestination = raw.trip_destination ? String(raw.trip_destination).trim().slice(0, 140) : null;

    if (!startDateRaw || !endDateRaw) {
      return res.status(400).json({ success: false, error: 'start_date dan end_date wajib diisi.' });
    }
    if (!location) {
      return res.status(400).json({ success: false, error: 'Lokasi wajib diisi.' });
    }
    if (!tripDestination) {
      return res.status(400).json({ success: false, error: 'Tujuan pemakaian wajib diisi.' });
    }
    if (totalPrice <= 0) {
      return res.status(400).json({ success: false, error: 'total_price wajib diisi.' });
    }

    const startNorm = normalizeToSqliteDateTime(startDateRaw);
    const endNorm = normalizeToSqliteDateTime(endDateRaw);
    if (!startNorm || !endNorm) {
      return res.status(400).json({ success: false, error: 'Tanggal booking tidak valid.' });
    }

    const bufferMinutes = parseInt(process.env.UNIT_TURNAROUND_MINUTES || '0', 10) || 0;
    const bufPlus = bufferMinutes > 0 ? `+${bufferMinutes} minutes` : '+0 minutes';
    const bufMinus = bufferMinutes > 0 ? `-${bufferMinutes} minutes` : '+0 minutes';

    let resolvedItemName = raw.item_name ? String(raw.item_name).trim() : null;
    let assignedUnitId = null;
    let assignedPlateNumber = null;

    await dbRun('BEGIN IMMEDIATE');
    try {
      if (itemType === 'motor') {
        const motorId = parseInt(raw.motor_id, 10);
        if (!motorId) {
          const e = new Error('motor_id wajib dipilih.');
          e.statusCode = 400;
          throw e;
        }

        const motor = await dbGet(
          `SELECT id, name, COALESCE(display_name, name) as display_name FROM motors WHERE id = ? LIMIT 1`,
          [motorId]
        );
        if (!motor) {
          const e = new Error('Motor tidak ditemukan.');
          e.statusCode = 400;
          throw e;
        }
        resolvedItemName = resolvedItemName || motor.display_name || motor.name;

        const unit = await dbGet(
          `
          SELECT mu.id, mu.plate_number
          FROM motor_units mu
          WHERE mu.motor_id = ?
            AND mu.status = 'RDY'
            AND mu.id NOT IN (
              SELECT b.unit_id
              FROM bookings b
              WHERE b.item_type = 'motor'
                AND b.unit_id IS NOT NULL
                AND b.status NOT IN ('cancelled', 'completed', 'selesai')
                AND ${dtExpr('b.start_date')} < datetime(?, ?)
                AND ${dtExpr('b.end_date')}   > datetime(?, ?)
            )
            AND mu.id NOT IN (
              SELECT ub.unit_id
              FROM unit_blocks ub
              WHERE datetime(ub.start_at) < datetime(?, ?)
                AND datetime(ub.end_at)   > datetime(?, ?)
            )
          ORDER BY mu.id ASC
          LIMIT 1
          `,
          [
            motorId,
            endNorm, bufPlus,
            startNorm, bufMinus,
            endNorm, bufPlus,
            startNorm, bufMinus,
          ]
        );
        if (!unit) {
          const e = new Error('Motor tidak tersedia untuk rentang tanggal tersebut.');
          e.statusCode = 409;
          throw e;
        }
        assignedUnitId = unit.id;
        assignedPlateNumber = unit.plate_number || null;
      }

      if (itemType === 'car') {
        const carId = parseInt(raw.car_id, 10);
        if (!carId) {
          const e = new Error('car_id wajib dipilih.');
          e.statusCode = 400;
          throw e;
        }

        const car = await dbGet(
          `SELECT id, name, COALESCE(display_name, name) as display_name FROM cars WHERE id = ? LIMIT 1`,
          [carId]
        );
        if (!car) {
          const e = new Error('Mobil tidak ditemukan.');
          e.statusCode = 400;
          throw e;
        }
        resolvedItemName = resolvedItemName || car.display_name || car.name;

        const preferLike = String(location || '').toLowerCase().includes('solo') ? '%solo%' : '%yogya%';
        const unit = await dbGet(
          `
          SELECT cu.id, cu.plate_number
          FROM car_units cu
          WHERE cu.car_id = ?
            AND cu.status = 'RDY'
            AND cu.id NOT IN (
              SELECT b.unit_id
              FROM bookings b
              WHERE b.item_type = 'car'
                AND b.unit_id IS NOT NULL
                AND b.status NOT IN ('cancelled', 'completed', 'selesai')
                AND ${dtExpr('b.start_date')} < datetime(?, ?)
                AND ${dtExpr('b.end_date')}   > datetime(?, ?)
            )
            AND cu.id NOT IN (
              SELECT cub.car_unit_id
              FROM car_unit_blocks cub
              WHERE datetime(cub.start_at) < datetime(?, ?)
                AND datetime(cub.end_at)   > datetime(?, ?)
            )
          ORDER BY
            CASE WHEN lower(COALESCE(cu.current_location, '')) LIKE ? THEN 0 ELSE 1 END,
            cu.id ASC
          LIMIT 1
          `,
          [
            carId,
            endNorm, bufPlus,
            startNorm, bufMinus,
            endNorm, bufPlus,
            startNorm, bufMinus,
            preferLike,
          ]
        );
        if (!unit) {
          const e = new Error('Mobil tidak tersedia untuk rentang tanggal tersebut.');
          e.statusCode = 409;
          throw e;
        }
        assignedUnitId = unit.id;
        assignedPlateNumber = unit.plate_number || null;
      }

      const paidAmount = paymentStatus === 'paid' ? totalPrice : 0;
      const promoCode = raw.promo_code ? String(raw.promo_code).trim().toUpperCase() : null;
      const priceNotes = raw.price_notes ? String(raw.price_notes).trim().slice(0, 240) : null;

      await dbRun(
        `INSERT INTO bookings (
           order_id, user_id, item_type, item_name, location,
           trip_scope, trip_destination,
           start_date, end_date,
           base_price, discount_amount, promo_code, service_fee, extend_fee, addon_fee, delivery_fee,
           paid_amount, total_price, status, payment_status, payment_method, duration_hours, price_notes,
           unit_id, plate_number
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          userId,
          itemType,
          resolvedItemName,
          location,
          tripScope,
          tripDestination,
          startDateRaw,
          endDateRaw,
          basePrice,
          discountAmount,
          promoCode,
          serviceFee,
          addonFee,
          deliveryFee,
          paidAmount,
          totalPrice,
          paymentStatus,
          paymentMethod,
          durationHours,
          priceNotes,
          assignedUnitId,
          assignedPlateNumber,
        ]
      );

      if (paymentStatus === 'unpaid') {
        await dbRun(
          `UPDATE bookings
           SET expires_at = datetime('now', ?)
           WHERE order_id = ? AND status = 'pending' AND payment_status = 'unpaid'`,
          [`+${ttlMin} minutes`, orderId]
        ).catch(() => {});
      }

      await dbRun('COMMIT');
    } catch (e) {
      try { await dbRun('ROLLBACK'); } catch {}
      throw e;
    }

    notifyNewBooking(
      {
        order_id: orderId,
        item_type: itemType,
        item_name: resolvedItemName,
        location,
        start_date: startDateRaw,
        end_date: endDateRaw,
        total_price: totalPrice,
        payment_method: paymentMethod,
        plate_number: assignedPlateNumber,
        trip_scope: tripScope,
        trip_destination: tripDestination,
      },
      userRow
    ).catch(() => {});

    return res.status(201).json({ success: true, message: 'Booking manual dibuat.', data: { order_id: orderId } });
  } catch (err) {
    const status = err?.statusCode || 500;
    if (status !== 500) return res.status(status).json({ success: false, error: err.message || 'Gagal membuat booking.' });
    console.error('POST /admin/manual/bookings error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal membuat booking.' });
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
              item_type,
              start_date,
              end_date,
              unit_id,
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

    // Prevent unit collision (motor only)
    const candidateUnitIdRaw = unit_id !== undefined && unit_id !== null && unit_id !== '' ? unit_id : current.unit_id;
    const candidateUnitId = candidateUnitIdRaw ? parseInt(candidateUnitIdRaw, 10) : null;
    const bufferMinutes = parseInt(process.env.UNIT_TURNAROUND_MINUTES || '0', 10) || 0;

    if (String(current.item_type || '').toLowerCase() === 'motor') {
      const nextStatus = String(status || '').toLowerCase();
      const wantsUnitCheck = !!candidateUnitId && (unit_id || nextStatus === 'active');

      if (wantsUnitCheck) {
        const conflict = await hasUnitConflict({
          unitId: candidateUnitId,
          orderId: current.order_id,
          startDate: current.start_date,
          endDate: current.end_date,
          bufferMinutes,
        });

        if (conflict) {
          return res.status(409).json({
            success: false,
            error: 'Unit ini bentrok dengan booking lain pada rentang tanggal yang sama.',
          });
        }

        // Manual blocks (cleaning/maintenance/etc)
        const startNorm = normalizeToSqliteDateTime(current.start_date);
        const endNorm = normalizeToSqliteDateTime(current.end_date);
        const block = await dbGet(
          `
          SELECT id, reason
          FROM unit_blocks
          WHERE unit_id = ?
            AND datetime(start_at) < datetime(?, ?)
            AND datetime(end_at)   > datetime(?, ?)
          LIMIT 1
          `,
          [
            candidateUnitId,
            endNorm,
            bufferMinutes > 0 ? `+${bufferMinutes} minutes` : '+0 minutes',
            startNorm,
            bufferMinutes > 0 ? `-${bufferMinutes} minutes` : '+0 minutes',
          ]
        );

        if (block) {
          return res.status(409).json({
            success: false,
            error: `Unit sedang diblokir: ${block.reason || 'Tidak tersedia'}.`,
          });
        }

        // Ensure unit exists (and is not OUT)
        const unitRow = await dbGet(`SELECT id, status, plate_number FROM motor_units WHERE id = ? LIMIT 1`, [candidateUnitId]);
        if (!unitRow) {
          return res.status(400).json({ success: false, error: 'Unit/plat tidak ditemukan.' });
        }
        if (String(unitRow.status || '').toUpperCase() === 'OUT') {
          return res.status(400).json({ success: false, error: 'Unit sedang OUT dan tidak bisa dipakai.' });
        }
      }
    }

    let setClauses = ['status = ?'];
    let params = [status];

    if (payment_status) { setClauses.push('payment_status = ?'); params.push(payment_status); }
    if (unit_id)        { setClauses.push('unit_id = ?');        params.push(candidateUnitId); }
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

    // Ticketing: issue voucher(s) once payment marked paid (idempotent)
    try {
      const nextPay = payment_status ? String(payment_status).toLowerCase() : String(current.payment_status || '').toLowerCase();
      const itemType = String(current.item_type || '').toLowerCase();
      if (itemType === 'ticket' && nextPay === 'paid') {
        const r = await issueTicketVouchersForOrder({ orderId: current.order_id });
        if (!r.ok) console.error('⚠️  ticket voucher issue error:', r.error);
      }
    } catch (ticketErr) {
      console.error('⚠️  ticket voucher issue error:', ticketErr.message);
    }

    // AUTO-SYNC logistics tasks when payment is marked paid / booking cancelled
    try {
      const nextPay = payment_status ? String(payment_status).toLowerCase() : String(current.payment_status || '').toLowerCase();
      const nextStatus = String(status || '').toLowerCase();
      const itemType = String(current.item_type || '').toLowerCase();
      if (['motor', 'car'].includes(itemType)) {
        if (nextStatus === 'cancelled' || nextPay === 'unpaid') {
          await cancelLogisticsTasksForBooking({ orderId: current.order_id });
        } else if (nextPay === 'paid') {
          await upsertLogisticsTasksForBooking({ orderId: current.order_id, createdBy: req.user?.id });
        }
      }
    } catch (syncErr) {
      console.error('⚠️  logistics auto-sync error:', syncErr.message);
    }

    const completedStatuses = ['completed', 'selesai'];
    if (completedStatuses.includes(status.toLowerCase())) {
      try {
        const booking = await dbGet(
          `SELECT user_id, total_price FROM bookings WHERE order_id = ?`,
          [req.params.orderId]
        );
        if (booking) {
          const user = await dbGet(
            `SELECT user_tier, season_trip_count, season_miles_earned FROM users WHERE id = ?`,
            [booking.user_id]
          );
          const currentTier  = user?.user_tier || 'backpacker';
          const multiplier   = TIER_MULTIPLIER[currentTier] || 1.0;
          const baseMiles    = Math.floor((booking.total_price || 0) / 1000);
          const earnedMiles  = Math.floor(baseMiles * multiplier);

          if (earnedMiles > 0) {
            const newSeasonMiles = (user?.season_miles_earned || 0) + earnedMiles;
            const newSeasonTrips = (user?.season_trip_count  || 0) + 1;
            const newTier        = calcTier(newSeasonMiles, newSeasonTrips);

            await dbRun(
              `UPDATE users SET
                 miles               = miles + ?,
                 season_miles_earned = ?,
                 season_trip_count   = ?,
                 user_tier           = ?
               WHERE id = ?`,
              [earnedMiles, newSeasonMiles, newSeasonTrips, newTier, booking.user_id]
            );
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
// EARLY RETURN — kembali lebih awal
// Mengupdate end_date ke waktu aktual + auto-buffer block
// ==========================================
router.put('/bookings/:orderId/early-return', requirePermission('booking'), async (req, res) => {
  try {
    const { actual_return_at, buffer_minutes, notes } = req.body || {};

    const booking = await dbGet(
      `SELECT order_id, status, unit_id, user_id, total_price, start_date, end_date
       FROM bookings WHERE order_id = ? LIMIT 1`,
      [req.params.orderId]
    );
    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking tidak ditemukan.' });
    }
    if (!['active', 'pending'].includes(String(booking.status || '').toLowerCase())) {
      return res.status(400).json({ success: false, error: 'Booking harus berstatus active untuk early return.' });
    }

    const returnAt = normalizeToSqliteDateTime(actual_return_at || new Date().toISOString());

    // Pastikan return time tidak lebih awal dari start_date
    if (new Date(returnAt) <= new Date(normalizeToSqliteDateTime(booking.start_date))) {
      return res.status(400).json({ success: false, error: 'Waktu kembali tidak boleh sebelum waktu mulai.' });
    }

    const noteText = notes ? `Kembali lebih awal. ${notes}` : 'Kembali lebih awal.';

    await dbRun(
      `UPDATE bookings
         SET end_date = ?,
             status = 'selesai',
             price_notes = CASE
               WHEN price_notes IS NULL OR price_notes = '' THEN ?
               ELSE price_notes || ' | ' || ?
             END
       WHERE order_id = ?`,
      [returnAt, noteText, noteText, req.params.orderId]
    );

    // Auto-create buffer block untuk bersih-bersih
    if (booking.unit_id) {
      const bufMins = Math.min(240, Math.max(0, parseInt(buffer_minutes ?? 60, 10) || 60));
      if (bufMins > 0) {
        const bufEnd = new Date(returnAt.replace(' ', 'T'));
        bufEnd.setMinutes(bufEnd.getMinutes() + bufMins);
        const bufEndStr = normalizeToSqliteDateTime(bufEnd.toISOString());
        await dbRun(
          `INSERT INTO unit_blocks (unit_id, start_at, end_at, reason, block_type, notes, created_by)
           VALUES (?, ?, ?, 'Buffer bersih', 'buffer', ?, 'system')`,
          [booking.unit_id, returnAt, bufEndStr, `Auto-buffer ${bufMins}m setelah early return ${req.params.orderId}`]
        );
      }
    }

    // Tambahkan miles reward
    try {
      const earnedMiles = Math.floor((booking.total_price || 0) / 10000);
      if (earnedMiles > 0 && booking.user_id) {
        await dbRun(`UPDATE users SET miles = miles + ? WHERE id = ?`, [earnedMiles, booking.user_id]);
      }
    } catch (milesErr) {
      console.error('⚠️  Miles gagal:', milesErr.message);
    }

    res.json({ success: true, message: 'Early return berhasil dicatat. Unit akan tersedia setelah buffer.' });
  } catch (err) {
    console.error('PUT /admin/bookings/:orderId/early-return error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mencatat early return.' });
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
// MILES REWARDS MANAGEMENT (Akses: pricing)
// ==========================================
router.get('/miles-rewards', requirePermission('pricing'), async (req, res) => {
  try {
    const rows = await dbAll(`SELECT * FROM miles_rewards ORDER BY is_active DESC, miles_cost ASC, id DESC`);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /admin/miles-rewards error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil Miles rewards.' });
  }
});

router.post('/miles-rewards', requirePermission('pricing'), async (req, res) => {
  try {
    const {
      title,
      reward_type,
      miles_cost,
      discount_percent,
      max_discount,
      discount_amount,
      min_order_amount,
      allowed_item_types,
      valid_days,
      desc,
      rule_json,
      is_active,
    } = req.body || {};

    const t = String(title || '').trim();
    if (!t) return res.status(400).json({ success: false, error: 'Judul reward wajib diisi.' });

    const type = String(reward_type || 'percent').trim().toLowerCase();
    if (!['percent', 'fixed'].includes(type)) {
      return res.status(400).json({ success: false, error: 'reward_type harus "percent" atau "fixed".' });
    }

    const cost = Math.max(0, parseInt(miles_cost, 10) || 0);
    if (cost <= 0) return res.status(400).json({ success: false, error: 'Miles cost harus > 0.' });

    let pct = 0;
    let max = 0;
    let amt = 0;
    if (type === 'fixed') {
      amt = Math.max(0, parseInt(discount_amount, 10) || 0);
      if (amt <= 0) return res.status(400).json({ success: false, error: 'discount_amount harus > 0 untuk reward fixed.' });
    } else {
      pct = parseInt(discount_percent, 10);
      if (Number.isNaN(pct) || pct < 1 || pct > 100) {
        return res.status(400).json({ success: false, error: 'discount_percent harus 1-100.' });
      }
      max = Math.max(0, parseInt(max_discount, 10) || 0);
    }

    const minOrder = Math.max(0, parseInt(min_order_amount, 10) || 0);
    const days = Math.max(1, Math.min(365, parseInt(valid_days, 10) || 30));

    const types =
      Array.isArray(allowed_item_types)
        ? allowed_item_types.map((x) => String(x).trim().toLowerCase()).filter(Boolean).join(',')
        : (allowed_item_types ? String(allowed_item_types).trim().toLowerCase() : null);

    let ruleJson = null;
    if (rule_json !== undefined && rule_json !== null && String(rule_json).trim() !== '') {
      try {
        ruleJson = typeof rule_json === 'string' ? JSON.stringify(JSON.parse(rule_json)) : JSON.stringify(rule_json);
      } catch {
        return res.status(400).json({ success: false, error: 'rule_json harus JSON yang valid.' });
      }
    }

    const result = await dbRun(
      `INSERT INTO miles_rewards
        (title, reward_type, miles_cost, discount_percent, max_discount, discount_amount, min_order_amount, allowed_item_types, valid_days, desc, rule_json, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        t,
        type,
        cost,
        pct,
        max,
        amt,
        minOrder,
        types,
        days,
        desc ? String(desc).trim().slice(0, 500) : null,
        ruleJson,
        is_active ? 1 : 0,
      ]
    );

    const created = await dbGet(`SELECT * FROM miles_rewards WHERE id = ?`, [result.lastID]);
    res.status(201).json({ success: true, message: 'Miles reward berhasil ditambahkan.', data: created });
  } catch (err) {
    console.error('POST /admin/miles-rewards error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal menambahkan Miles reward.' });
  }
});

router.put('/miles-rewards/:id', requirePermission('pricing'), async (req, res) => {
  try {
    const existing = await dbGet(`SELECT * FROM miles_rewards WHERE id = ?`, [req.params.id]);
    if (!existing) return res.status(404).json({ success: false, error: 'Miles reward tidak ditemukan.' });

    const patch = req.body || {};
    const title = patch.title !== undefined ? String(patch.title || '').trim() : String(existing.title || '').trim();
    if (!title) return res.status(400).json({ success: false, error: 'Judul reward wajib diisi.' });

    const type = patch.reward_type !== undefined ? String(patch.reward_type || '').trim().toLowerCase() : String(existing.reward_type || 'percent').toLowerCase();
    if (!['percent', 'fixed'].includes(type)) {
      return res.status(400).json({ success: false, error: 'reward_type harus "percent" atau "fixed".' });
    }

    const cost = patch.miles_cost !== undefined ? Math.max(0, parseInt(patch.miles_cost, 10) || 0) : (parseInt(existing.miles_cost, 10) || 0);
    if (cost <= 0) return res.status(400).json({ success: false, error: 'Miles cost harus > 0.' });

    let pct = patch.discount_percent !== undefined ? parseInt(patch.discount_percent, 10) : (parseInt(existing.discount_percent, 10) || 0);
    let max = patch.max_discount !== undefined ? Math.max(0, parseInt(patch.max_discount, 10) || 0) : (parseInt(existing.max_discount, 10) || 0);
    let amt = patch.discount_amount !== undefined ? Math.max(0, parseInt(patch.discount_amount, 10) || 0) : (parseInt(existing.discount_amount, 10) || 0);

    if (type === 'fixed') {
      pct = 0;
      max = 0;
      if (amt <= 0) return res.status(400).json({ success: false, error: 'discount_amount harus > 0 untuk reward fixed.' });
    } else {
      amt = 0;
      if (Number.isNaN(pct) || pct < 1 || pct > 100) {
        return res.status(400).json({ success: false, error: 'discount_percent harus 1-100.' });
      }
    }

    const minOrder = patch.min_order_amount !== undefined
      ? Math.max(0, parseInt(patch.min_order_amount, 10) || 0)
      : (parseInt(existing.min_order_amount, 10) || 0);
    const days = patch.valid_days !== undefined
      ? Math.max(1, Math.min(365, parseInt(patch.valid_days, 10) || 30))
      : (parseInt(existing.valid_days, 10) || 30);

    const types =
      patch.allowed_item_types !== undefined
        ? (Array.isArray(patch.allowed_item_types)
          ? patch.allowed_item_types.map((x) => String(x).trim().toLowerCase()).filter(Boolean).join(',')
          : (patch.allowed_item_types ? String(patch.allowed_item_types).trim().toLowerCase() : null))
        : (existing.allowed_item_types || null);

    let ruleJson = patch.rule_json !== undefined ? patch.rule_json : existing.rule_json;
    if (patch.rule_json !== undefined) {
      if (patch.rule_json === null || String(patch.rule_json).trim() === '') {
        ruleJson = null;
      } else {
        try {
          ruleJson = typeof patch.rule_json === 'string' ? JSON.stringify(JSON.parse(patch.rule_json)) : JSON.stringify(patch.rule_json);
        } catch {
          return res.status(400).json({ success: false, error: 'rule_json harus JSON yang valid.' });
        }
      }
    }

    const desc = patch.desc !== undefined
      ? (patch.desc ? String(patch.desc).trim().slice(0, 500) : null)
      : (existing.desc || null);

    const isActive = patch.is_active !== undefined ? (patch.is_active ? 1 : 0) : (existing.is_active ? 1 : 0);

    await dbRun(
      `UPDATE miles_rewards
       SET title = ?, reward_type = ?, miles_cost = ?, discount_percent = ?, max_discount = ?, discount_amount = ?,
           min_order_amount = ?, allowed_item_types = ?, valid_days = ?, desc = ?, rule_json = ?, is_active = ?
       WHERE id = ?`,
      [title, type, cost, pct, max, amt, minOrder, types, days, desc, ruleJson, isActive, req.params.id]
    );

    const updated = await dbGet(`SELECT * FROM miles_rewards WHERE id = ?`, [req.params.id]);
    res.json({ success: true, message: 'Miles reward berhasil diperbarui.', data: updated });
  } catch (err) {
    console.error('PUT /admin/miles-rewards/:id error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal memperbarui Miles reward.' });
  }
});

router.put('/miles-rewards/:id/toggle', requirePermission('pricing'), async (req, res) => {
  try {
    const { is_active } = req.body || {};
    await dbRun(`UPDATE miles_rewards SET is_active = ? WHERE id = ?`, [is_active ? 1 : 0, req.params.id]);
    res.json({ success: true, message: 'Status Miles reward berhasil diupdate.' });
  } catch (err) {
    console.error('PUT /admin/miles-rewards/:id/toggle error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengubah status Miles reward.' });
  }
});

router.delete('/miles-rewards/:id', requirePermission('pricing'), async (req, res) => {
  try {
    const used = await dbGet(`SELECT 1 as ok FROM miles_vouchers WHERE reward_id = ? LIMIT 1`, [req.params.id]);
    if (used) {
      return res.status(400).json({
        success: false,
        error: 'Reward sudah pernah ditukarkan. Demi audit, reward tidak bisa dihapus; silakan nonaktifkan saja.',
      });
    }
    await dbRun(`DELETE FROM miles_rewards WHERE id = ?`, [req.params.id]);
    res.json({ success: true, message: 'Miles reward berhasil dihapus.' });
  } catch (err) {
    console.error('DELETE /admin/miles-rewards/:id error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal menghapus Miles reward.' });
  }
});

// ==========================================
// PARTNERSHIPS MANAGEMENT (Akses: partners)
// ==========================================
router.get('/partners', requirePermission('partners'), async (req, res) => {
  try {
    const rows = await dbAll(`SELECT * FROM partners ORDER BY sort_order ASC, id DESC`);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /admin/partners error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil data partnership.' });
  }
});

router.post('/partners', requirePermission('partners'), async (req, res) => {
  try {
    const body = req.body || {};
    const name = String(body.name || '').trim();
    if (!name) {
      return res.status(400).json({ success: false, error: 'Nama partner wajib diisi.' });
    }

    const category = String(body.category || 'Partner').trim() || 'Partner';
    const city = String(body.city || 'Yogyakarta').trim() || 'Yogyakarta';
    const address = body.address !== undefined ? String(body.address || '').trim() : null;
    const headline = body.headline !== undefined ? String(body.headline || '').trim() : null;
    const promo_text = body.promo_text !== undefined ? String(body.promo_text || '').trim() : null;
    const terms = body.terms !== undefined ? String(body.terms || '').trim() : null;
    const image_url = body.image_url !== undefined ? String(body.image_url || '').trim() : null;
    const cta_label = String(body.cta_label || 'Lihat Promo').trim() || 'Lihat Promo';
    const cta_url = body.cta_url !== undefined ? String(body.cta_url || '').trim() : null;
    const maps_url = body.maps_url !== undefined ? String(body.maps_url || '').trim() : null;
    const phone_wa = body.phone_wa !== undefined ? String(body.phone_wa || '').trim() : null;
    const sort_order = Number.isFinite(parseInt(body.sort_order, 10)) ? parseInt(body.sort_order, 10) : 0;
    const valid_until = body.valid_until !== undefined ? String(body.valid_until || '').trim() : null;
    const is_active = body.is_active ? 1 : 0;

    const result = await dbRun(
      `
      INSERT INTO partners (
        name, category, city, address, headline, promo_text, terms,
        image_url, cta_label, cta_url, maps_url, phone_wa,
        sort_order, valid_until, is_active, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `,
      [
        name,
        category,
        city,
        address || null,
        headline || null,
        promo_text || null,
        terms || null,
        image_url || null,
        cta_label,
        cta_url || null,
        maps_url || null,
        phone_wa || null,
        sort_order,
        valid_until || null,
        is_active,
      ]
    );

    const created = await dbGet(`SELECT * FROM partners WHERE id = ?`, [result.lastID]);
    res.status(201).json({ success: true, message: 'Partner berhasil ditambahkan.', data: created });
  } catch (err) {
    console.error('POST /admin/partners error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal menambahkan partner.' });
  }
});

router.put('/partners/:id', requirePermission('partners'), async (req, res) => {
  try {
    const existing = await dbGet(`SELECT * FROM partners WHERE id = ?`, [req.params.id]);
    if (!existing) return res.status(404).json({ success: false, error: 'Partner tidak ditemukan.' });

    const body = req.body || {};
    const name = String(body.name ?? existing.name ?? '').trim();
    if (!name) return res.status(400).json({ success: false, error: 'Nama partner wajib diisi.' });

    const category = String(body.category ?? existing.category ?? 'Partner').trim() || 'Partner';
    const city = String(body.city ?? existing.city ?? 'Yogyakarta').trim() || 'Yogyakarta';
    const address = body.address !== undefined ? String(body.address || '').trim() : (existing.address || null);
    const headline = body.headline !== undefined ? String(body.headline || '').trim() : (existing.headline || null);
    const promo_text = body.promo_text !== undefined ? String(body.promo_text || '').trim() : (existing.promo_text || null);
    const terms = body.terms !== undefined ? String(body.terms || '').trim() : (existing.terms || null);
    const image_url = body.image_url !== undefined ? String(body.image_url || '').trim() : (existing.image_url || null);
    const cta_label = String(body.cta_label ?? existing.cta_label ?? 'Lihat Promo').trim() || 'Lihat Promo';
    const cta_url = body.cta_url !== undefined ? String(body.cta_url || '').trim() : (existing.cta_url || null);
    const maps_url = body.maps_url !== undefined ? String(body.maps_url || '').trim() : (existing.maps_url || null);
    const phone_wa = body.phone_wa !== undefined ? String(body.phone_wa || '').trim() : (existing.phone_wa || null);
    const sort_order = body.sort_order !== undefined ? (parseInt(body.sort_order, 10) || 0) : (parseInt(existing.sort_order, 10) || 0);
    const valid_until = body.valid_until !== undefined ? String(body.valid_until || '').trim() : (existing.valid_until || null);
    const is_active = body.is_active !== undefined ? (body.is_active ? 1 : 0) : (existing.is_active ? 1 : 0);

    await dbRun(
      `
      UPDATE partners
      SET name = ?, category = ?, city = ?, address = ?, headline = ?, promo_text = ?, terms = ?,
          image_url = ?, cta_label = ?, cta_url = ?, maps_url = ?, phone_wa = ?,
          sort_order = ?, valid_until = ?, is_active = ?, updated_at = datetime('now')
      WHERE id = ?
      `,
      [
        name,
        category,
        city,
        address || null,
        headline || null,
        promo_text || null,
        terms || null,
        image_url || null,
        cta_label,
        cta_url || null,
        maps_url || null,
        phone_wa || null,
        sort_order,
        valid_until || null,
        is_active,
        req.params.id,
      ]
    );

    const updated = await dbGet(`SELECT * FROM partners WHERE id = ?`, [req.params.id]);
    res.json({ success: true, message: 'Partner berhasil diperbarui.', data: updated });
  } catch (err) {
    console.error('PUT /admin/partners/:id error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal memperbarui partner.' });
  }
});

router.patch('/partners/:id/active', requirePermission('partners'), async (req, res) => {
  try {
    const { is_active } = req.body || {};
    await dbRun(
      `UPDATE partners SET is_active = ?, updated_at = datetime('now') WHERE id = ?`,
      [is_active ? 1 : 0, req.params.id]
    );
    res.json({ success: true, message: 'Status partner berhasil diupdate.' });
  } catch (err) {
    console.error('PATCH /admin/partners/:id/active error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengubah status partner.' });
  }
});

router.delete('/partners/:id', requirePermission('partners'), async (req, res) => {
  try {
    await dbRun(`DELETE FROM partners WHERE id = ?`, [req.params.id]);
    res.json({ success: true, message: 'Partner berhasil dihapus.' });
  } catch (err) {
    console.error('DELETE /admin/partners/:id error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal menghapus partner.' });
  }
});

router.get('/partners/vouchers', requirePermission('partners'), async (req, res) => {
  try {
    const status = String(req.query.status || 'all').trim().toLowerCase();
    const q = String(req.query.q || '').trim();

    const where = [];
    const params = [];

    if (status && status !== 'all') {
      where.push(`v.status = ?`);
      params.push(status);
    }

    if (q) {
      where.push(`(
        v.voucher_code LIKE ?
        OR p.name LIKE ?
        OR u.name LIKE ?
        OR u.email LIKE ?
        OR u.phone LIKE ?
      )`);
      const term = `%${q}%`;
      params.push(term, term, term, term, term);
    }

    const rows = await dbAll(
      `
      SELECT
        v.id,
        v.voucher_code,
        v.status,
        v.claimed_at,
        v.used_at,
        v.validation_note,
        p.id AS partner_id,
        p.name AS partner_name,
        p.category,
        p.city,
        p.valid_until,
        u.id AS user_id,
        u.name AS user_name,
        u.email AS user_email,
        u.phone AS user_phone,
        validator.name AS validated_by_name
      FROM partner_vouchers v
      INNER JOIN partners p ON p.id = v.partner_id
      INNER JOIN users u ON u.id = v.user_id
      LEFT JOIN users validator ON validator.id = v.validated_by
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY datetime(v.claimed_at) DESC, v.id DESC
      LIMIT 100
      `,
      params
    );

    const now = Date.now();
    const normalized = rows.map((row) => {
      const validUntilTs = row.valid_until ? new Date(row.valid_until).getTime() : null;
      const expired = row.status === 'claimed' && validUntilTs && !Number.isNaN(validUntilTs) && validUntilTs < now;
      return { ...row, status: expired ? 'expired' : row.status };
    });

    res.json({ success: true, data: normalized });
  } catch (err) {
    console.error('GET /admin/partners/vouchers error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil data voucher partner.' });
  }
});

router.post('/partners/vouchers/validate', requirePermission('partners'), async (req, res) => {
  try {
    const voucherCode = String(req.body?.voucher_code || '').trim().toUpperCase();
    const note = String(req.body?.note || '').trim();

    if (!voucherCode) {
      return res.status(400).json({ success: false, error: 'Kode voucher wajib diisi.' });
    }

    const voucher = await dbGet(
      `
      SELECT
        v.*,
        p.name AS partner_name,
        p.valid_until,
        u.name AS user_name,
        u.email AS user_email,
        u.phone AS user_phone
      FROM partner_vouchers v
      INNER JOIN partners p ON p.id = v.partner_id
      INNER JOIN users u ON u.id = v.user_id
      WHERE v.voucher_code = ?
      LIMIT 1
      `,
      [voucherCode]
    );

    if (!voucher) {
      return res.status(404).json({ success: false, error: 'Voucher tidak ditemukan.' });
    }

    if (voucher.status === 'used') {
      return res.status(409).json({ success: false, error: 'Voucher ini sudah pernah digunakan.' });
    }

    if (voucher.valid_until) {
      const validUntilTs = new Date(voucher.valid_until).getTime();
      if (!Number.isNaN(validUntilTs) && validUntilTs < Date.now()) {
        await dbRun(
          `UPDATE partner_vouchers SET status = 'expired', validation_note = COALESCE(validation_note, ?)
           WHERE id = ?`,
          ['Voucher expired saat validasi.', voucher.id]
        );
        return res.status(400).json({ success: false, error: 'Voucher ini sudah expired.' });
      }
    }

    await dbRun(
      `
      UPDATE partner_vouchers
      SET status = 'used',
          used_at = datetime('now'),
          validated_by = ?,
          validation_note = ? 
      WHERE id = ?
      `,
      [req.user.id, note || null, voucher.id]
    );

    const updated = await dbGet(
      `
      SELECT
        v.id,
        v.voucher_code,
        v.status,
        v.claimed_at,
        v.used_at,
        v.validation_note,
        p.name AS partner_name,
        u.name AS user_name,
        u.email AS user_email,
        u.phone AS user_phone
      FROM partner_vouchers v
      INNER JOIN partners p ON p.id = v.partner_id
      INNER JOIN users u ON u.id = v.user_id
      WHERE v.id = ?
      `,
      [voucher.id]
    );

    res.json({
      success: true,
      message: `Voucher ${voucherCode} berhasil divalidasi.`,
      data: updated,
    });
  } catch (err) {
    console.error('POST /admin/partners/vouchers/validate error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal memvalidasi voucher partner.' });
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
  upload.single('image')(req, res, async (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ success: false, error: 'Ukuran file terlalu besar. Maksimal 5MB.' });
      }
      return res.status(400).json({ success: false, error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Tidak ada file yang diunggah.' });
    }

    try {
      if (imagekit) {
        const fileBuffer = fs.readFileSync(req.file.path);
        const uploaded = await imagekit.upload({
          file: fileBuffer.toString('base64'),
          fileName: req.file.filename,
          folder: '/articles',
          useUniqueFileName: true,
        });

        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

        return res.json({
          success: true,
          url: uploaded.url,
          filePath: uploaded.filePath,
          provider: 'imagekit',
        });
      }

      const fileUrl = `/uploads/${req.file.filename}`;
      return res.json({ success: true, url: fileUrl, provider: 'local' });
    } catch (uploadErr) {
      console.error('POST /admin/upload error:', uploadErr.message);
      if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(500).json({ success: false, error: 'Gagal mengunggah gambar ke media storage.' });
    }
  });
});

// Upload gambar untuk katalog motor (akses: armada) → default folder ImageKit: /motors
router.post('/upload/motors', requirePermission('armada'), (req, res) => {
  memoryUpload.single('image')(req, res, async (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ success: false, error: 'Ukuran file terlalu besar. Maksimal 5MB.' });
      }
      return res.status(400).json({ success: false, error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Tidak ada file yang diunggah.' });
    }

    try {
      const ext = getSafeExtension(req.file.originalname);
      if (!ext) return res.status(400).json({ success: false, error: 'Tipe file tidak diizinkan.' });
      const randomName = crypto.randomBytes(16).toString('hex');
      const filename = `motor-${randomName}${ext}`;

      const result = await uploadBufferToStorage({
        buffer: req.file.buffer,
        filename,
        folder: '/motors',
      });

      return res.json({ success: true, ...result });
    } catch (uploadErr) {
      console.error('POST /admin/upload/motors error:', uploadErr.message);
      return res.status(500).json({ success: false, error: 'Gagal mengunggah gambar motor.' });
    }
  });
});

// Upload gambar untuk katalog mobil (akses: armada) → folder ImageKit: /cars
router.post('/upload/cars', requirePermission('armada'), (req, res) => {
  memoryUpload.single('image')(req, res, async (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ success: false, error: 'Ukuran file terlalu besar. Maksimal 5MB.' });
      }
      return res.status(400).json({ success: false, error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Tidak ada file yang diunggah.' });
    }

    try {
      const ext = getSafeExtension(req.file.originalname);
      if (!ext) return res.status(400).json({ success: false, error: 'Tipe file tidak diizinkan.' });
      const randomName = crypto.randomBytes(16).toString('hex');
      const filename = `car-${randomName}${ext}`;

      const result = await uploadBufferToStorage({
        buffer: req.file.buffer,
        filename,
        folder: '/cars',
      });

      return res.json({ success: true, ...result });
    } catch (uploadErr) {
      console.error('POST /admin/upload/cars error:', uploadErr.message);
      return res.status(500).json({ success: false, error: 'Gagal mengunggah gambar mobil.' });
    }
  });
});

// Upload gambar banner promo (akses: pricing) → folder ImageKit: /banner (sesuai Media Library)
router.post('/upload/banner', requirePermission('pricing'), (req, res) => {
  memoryUpload.single('image')(req, res, async (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ success: false, error: 'Ukuran file terlalu besar. Maksimal 5MB.' });
      }
      return res.status(400).json({ success: false, error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Tidak ada file yang diunggah.' });
    }

    try {
      const ext = getSafeExtension(req.file.originalname);
      if (!ext) return res.status(400).json({ success: false, error: 'Tipe file tidak diizinkan.' });
      const randomName = crypto.randomBytes(16).toString('hex');
      const filename = `banner-${randomName}${ext}`;

      const result = await uploadBufferToStorage({
        buffer: req.file.buffer,
        filename,
        folder: '/banner',
      });

      return res.json({ success: true, ...result });
    } catch (uploadErr) {
      console.error('POST /admin/upload/banner error:', uploadErr.message);
      return res.status(500).json({ success: false, error: 'Gagal mengunggah gambar banner.' });
    }
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

router.put('/admins/:id', requirePermission('settings'), async (req, res) => {
  try {
    const target = await dbGet(
      `SELECT id, role, email FROM users WHERE id = ? AND role IN ('admin', 'superadmin', 'subadmin') LIMIT 1`,
      [req.params.id]
    );

    if (!target) {
      return res.status(404).json({ success: false, error: 'Admin tidak ditemukan.' });
    }

    if (target.role === 'superadmin') {
      return res.status(403).json({ success: false, error: 'Akun Superadmin tidak dapat diubah dari menu ini.' });
    }

    const { name, email, password, phone, role, permissions } = req.body || {};

    if (!name || !email) {
      return res.status(400).json({ success: false, error: 'Nama dan email wajib diisi.' });
    }

    const validRoles = ['admin', 'subadmin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, error: 'Role tidak valid. Gunakan admin atau subadmin.' });
    }

    const emailNormalized = String(email).toLowerCase().trim();
    const emailOwner = await dbGet(`SELECT id FROM users WHERE email = ? AND id != ? LIMIT 1`, [emailNormalized, req.params.id]);
    if (emailOwner) {
      return res.status(409).json({ success: false, error: 'Email sudah digunakan akun lain.' });
    }

    const permsString = JSON.stringify(Array.isArray(permissions) ? permissions : []);

    if (password && String(password).trim()) {
      if (String(password).length < 6) {
        return res.status(400).json({ success: false, error: 'Password minimal 6 karakter.' });
      }

      const hashedPassword = await bcrypt.hash(String(password), 10);
      await dbRun(
        `UPDATE users
         SET name = ?, email = ?, password = ?, phone = ?, role = ?, permissions = ?
         WHERE id = ?`,
        [String(name).trim(), emailNormalized, hashedPassword, phone || '-', role, permsString, req.params.id]
      );
    } else {
      await dbRun(
        `UPDATE users
         SET name = ?, email = ?, phone = ?, role = ?, permissions = ?
         WHERE id = ?`,
        [String(name).trim(), emailNormalized, phone || '-', role, permsString, req.params.id]
      );
    }

    res.json({ success: true, message: 'Akun admin berhasil diperbarui.' });
  } catch (err) {
    console.error('PUT /admin/admins/:id error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal memperbarui admin.' });
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

// ==========================================
// GMAPS REVIEW — ADMIN
// ==========================================

// GET /api/admin/gmaps-reviews?status=pending|approved|rejected|all
router.get('/gmaps-reviews', verifyAdmin, async (req, res) => {
  try {
    const status = req.query.status || 'pending';
    const whereClause = status === 'all' ? '' : `WHERE gr.status = ?`;
    const params = status === 'all' ? [] : [status];

    const rows = await dbAll(
      `SELECT gr.id, gr.user_id, gr.order_id, gr.screenshot_url,
              gr.status, gr.reject_reason, gr.miles_awarded,
              gr.submitted_at, gr.reviewed_at,
              u.name AS user_name, u.phone AS user_phone
       FROM gmaps_reviews gr
       LEFT JOIN users u ON u.id = gr.user_id
       ${whereClause}
       ORDER BY gr.submitted_at DESC`,
      params
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /admin/gmaps-reviews error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil data review.' });
  }
});

// PUT /api/admin/gmaps-reviews/:id/approve
router.put('/gmaps-reviews/:id/approve', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const MILES_REWARD = 50;

    const review = await dbGet(`SELECT * FROM gmaps_reviews WHERE id = ?`, [id]);
    if (!review) return res.status(404).json({ success: false, error: 'Review tidak ditemukan.' });
    if (review.status !== 'pending') return res.status(400).json({ success: false, error: 'Review sudah diproses.' });

    await dbRun(
      `UPDATE gmaps_reviews SET status = 'approved', reviewed_by = ?, reviewed_at = datetime('now'), miles_awarded = ? WHERE id = ?`,
      [req.user.id, MILES_REWARD, id]
    );
    await dbRun(
      `UPDATE users SET miles = COALESCE(miles, 0) + ?, has_reviewed_gmaps = 1 WHERE id = ?`,
      [MILES_REWARD, review.user_id]
    );

    res.json({ success: true, message: `Review disetujui. +${MILES_REWARD} Miles diberikan ke user.` });
  } catch (err) {
    console.error('PUT /admin/gmaps-reviews/:id/approve error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal approve review.' });
  }
});

// PUT /api/admin/gmaps-reviews/:id/reject
router.put('/gmaps-reviews/:id/reject', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const review = await dbGet(`SELECT * FROM gmaps_reviews WHERE id = ?`, [id]);
    if (!review) return res.status(404).json({ success: false, error: 'Review tidak ditemukan.' });
    if (review.status !== 'pending') return res.status(400).json({ success: false, error: 'Review sudah diproses.' });

    await dbRun(
      `UPDATE gmaps_reviews SET status = 'rejected', reviewed_by = ?, reviewed_at = datetime('now'), reject_reason = ? WHERE id = ?`,
      [req.user.id, reason || 'Screenshot tidak memenuhi syarat.', id]
    );

    res.json({ success: true, message: 'Review ditolak.' });
  } catch (err) {
    console.error('PUT /admin/gmaps-reviews/:id/reject error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal reject review.' });
  }
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
