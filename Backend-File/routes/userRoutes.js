const { notifyNewBooking, notifyExtendBooking, notifyKycPending, notifyGmapsReview, notifyPaymentProofUploaded } = require('../utils/telegram');
const { calculateMotorRentalBreakdown } = require('../utils/motorRentalPricing');
const { quoteDelivery } = require('../utils/deliveryPricing');
const multer = require('multer');
const path   = require('path');
const crypto = require('crypto');
const fs     = require('fs');
const express = require('express');
const ImageKit = require('imagekit');
const db = require('../db');
const { verifyUser } = require('../middlewares/authMiddleware');
const router = express.Router();

const dbGet = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
});

const dbAll = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows || []));
});

const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function(err) { err ? reject(err) : resolve({ lastID: this.lastID, changes: this.changes }); });
});

// Normalize datetime strings for overlap checks (keep consistent with admin/public queries)
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

const normalizeCityKey = (city) => {
  const v = String(city || '').trim().toLowerCase();
  if (v.includes('solo') || v.includes('balapan')) return 'solo';
  return 'yogyakarta';
};

const buildPartnerVoucherCode = (partnerId) => {
  const prefix = `PRT${String(partnerId).padStart(3, '0')}`;
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${Date.now().toString().slice(-6)}-${rand}`;
};

const buildMilesVoucherCode = () => {
  const prefix = 'BTM';
  const rand = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `${prefix}-${Date.now().toString().slice(-6)}-${rand}`;
};

const parseAllowedItemTypes = (csv) =>
  String(csv || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

// ==========================================
// Upload Bukti Transfer (User)
// ==========================================
const ALLOWED_PROOF_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_PROOF_FILE = 5 * 1024 * 1024; // 5MB

const imagekit = (
  process.env.IMAGEKIT_PUBLIC_KEY &&
  process.env.IMAGEKIT_PRIVATE_KEY &&
  process.env.IMAGEKIT_URL_ENDPOINT
) ? new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
}) : null;

const mimeToExt = (mimetype) => {
  if (mimetype === 'image/jpeg') return '.jpg';
  if (mimetype === 'image/png')  return '.png';
  if (mimetype === 'image/webp') return '.webp';
  if (mimetype === 'application/pdf') return '.pdf';
  return null;
};

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const uploadBufferToStorage = async ({ buffer, filename, folder, localDir }) => {
  if (imagekit) {
    const uploaded = await imagekit.upload({
      file: Buffer.from(buffer).toString('base64'),
      fileName: filename,
      folder,
      useUniqueFileName: true,
    });
    return { provider: 'imagekit', url: uploaded.url, fileId: uploaded.fileId, filePath: uploaded.filePath };
  }

  // Fallback: store in local uploads folder (relative URL to avoid mixed-content issues behind HTTPS)
  ensureDir(localDir);
  fs.writeFileSync(path.join(localDir, filename), buffer);
  const rel = `/${localDir.replace(/\\/g, '/').replace(/^\/+/, '')}/${filename}`;
  return { provider: 'local', url: rel, fileId: null, filePath: rel };
};

const uploadUserRecon = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PROOF_FILE },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_PROOF_TYPES.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Hanya JPG, PNG, WebP, atau PDF yang diizinkan.'));
  },
});

const dbTransaction = (queries) => new Promise((resolve, reject) => {
  db.serialize(() => {
    db.run('BEGIN TRANSACTION', (err) => {
      if (err) return reject(err);

      const runNext = (index) => {
        if (index >= queries.length) {
          db.run('COMMIT', (err) => err ? reject(err) : resolve());
          return;
        }
        const { sql, params } = queries[index];
        db.run(sql, params, (err) => {
          if (err) {
            db.run('ROLLBACK', () => reject(err));
            return;
          }
          runNext(index + 1);
        });
      };

      runNext(0);
    });
  });
});

// Semua route butuh login
router.use(verifyUser);

// ==========================================
// 1. DASHBOARD USER (ME)
// [PERBAIKAN] Ambil data sebagai array activeOrders + item_type + payment_status
// ==========================================
router.get('/dashboard/me', async (req, res) => {
  try {
    const user = await dbGet(
      `SELECT id, name, email, phone, kyc_status, kyc_code, miles,
              profile_picture, profile_banner, referral_code, role, location,
              has_completed_tc_gamification,
              user_tier, season_trip_count, season_miles_earned, season_start_date
       FROM users WHERE id = ?`,
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({ success: false, error: 'User tidak ditemukan.' });
    }

    // Mengambil semua order aktif sebagai array
    const activeOrders = await dbAll(
      `SELECT order_id as id, item_type, item_name as item, status, payment_status, location, 
              start_date as startDate, end_date as endDate, total_price,
              delivery_type, delivery_station_id, delivery_address,
              unit_id, plate_number
       FROM bookings 
       WHERE user_id = ? AND status IN ('pending', 'active') 
       ORDER BY start_date DESC`,
      [req.user.id]
    );

    res.json({ success: true, data: { user, activeOrders: activeOrders || [] } });

  } catch (err) {
    console.error('GET /dashboard/me error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil data dashboard.' });
  }
});

// ==========================================
// 2. UPDATE PROFILE
// ==========================================
router.put('/profile', async (req, res) => {
  try {
    const { name, phone, location } = req.body || {};

    if (!name || !phone) {
      return res.status(400).json({ success: false, error: 'Nama dan nomor telepon wajib diisi.' });
    }

    if (name.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'Nama minimal 2 karakter.' });
    }

    await dbRun(
      `UPDATE users SET name = ?, phone = ?, location = ? WHERE id = ?`,
      [name.trim(), phone.trim(), location || 'Lainnya', req.user.id]
    );

    res.json({ success: true, message: 'Profil berhasil diupdate.' });

  } catch (err) {
    console.error('PUT /profile error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengupdate profil.' });
  }
});

// ==========================================
// 3. TOP TRAVELLERS
// ==========================================
router.get('/dashboard/top-travellers', async (req, res) => {
  try {
    const rows = await dbAll(
      `SELECT name, miles FROM users WHERE miles > 0 ORDER BY miles DESC LIMIT 3`
    );
    res.json({ success: true, data: rows });

  } catch (err) {
    console.error('GET /top-travellers error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil data top travellers.' });
  }
});

// ==========================================
// 3b. MILES REWARDS (User)
// Tukar Miles → Voucher internal (terikat akun)
// ==========================================
router.get('/miles/rewards', async (req, res) => {
  try {
    const rows = await dbAll(
      `SELECT id, title, reward_type, miles_cost, discount_percent, max_discount, discount_amount,
              min_order_amount, allowed_item_types, valid_days, desc
       FROM miles_rewards
       WHERE is_active = 1
       ORDER BY miles_cost ASC, id ASC`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /miles/rewards error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil katalog rewards.' });
  }
});

router.get('/miles/vouchers', async (req, res) => {
  try {
    // Auto-expire vouchers yang sudah lewat waktu (best-effort)
    await dbRun(
      `UPDATE miles_vouchers
       SET status = 'expired'
       WHERE user_id = ?
         AND status = 'active'
         AND expires_at IS NOT NULL
         AND datetime(expires_at) <= datetime('now')`,
      [req.user.id]
    ).catch(() => {});

    const rows = await dbAll(
      `SELECT v.id, v.voucher_code, v.status, v.created_at, v.expires_at, v.used_at, v.used_order_id, v.cancelled_at,
              r.title, r.reward_type, r.discount_percent, r.max_discount, r.discount_amount, r.min_order_amount, r.allowed_item_types
       FROM miles_vouchers v
       JOIN miles_rewards r ON r.id = v.reward_id
       WHERE v.user_id = ?
       ORDER BY
         CASE v.status
           WHEN 'active' THEN 0
           WHEN 'used' THEN 1
           WHEN 'expired' THEN 2
           WHEN 'cancelled' THEN 3
           ELSE 9
         END,
         datetime(v.created_at) DESC`,
      [req.user.id]
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /miles/vouchers error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil voucher Miles.' });
  }
});

router.post('/miles/redeem', async (req, res) => {
  try {
    const rewardId = parseInt(req.body?.reward_id, 10);
    const idemKeyRaw = req.body?.idempotency_key;
    const idempotencyKey = idemKeyRaw ? String(idemKeyRaw).trim().slice(0, 80) : null;
    if (!rewardId) return res.status(400).json({ success: false, error: 'reward_id wajib diisi.' });

    // Fast path: retry dengan idempotency_key → balikan voucher yang sama
    if (idempotencyKey) {
      const existing = await dbGet(
        `SELECT v.voucher_code, u.miles as current_miles
         FROM miles_vouchers v
         JOIN users u ON u.id = v.user_id
         WHERE v.user_id = ? AND v.idempotency_key = ?
         LIMIT 1`,
        [req.user.id, idempotencyKey]
      );
      if (existing) {
        return res.json({
          success: true,
          message: 'Penukaran sudah diproses.',
          voucher_code: existing.voucher_code,
          newMiles: Number(existing.current_miles) || 0,
          idempotent: true,
        });
      }
    }

    await dbRun('BEGIN IMMEDIATE');
    try {
      const reward = await dbGet(
        `SELECT id, title, miles_cost, valid_days, is_active
         FROM miles_rewards
         WHERE id = ?
         LIMIT 1`,
        [rewardId]
      );
      if (!reward || Number(reward.is_active) !== 1) {
        const e = new Error('Reward tidak ditemukan atau sudah tidak aktif.');
        e.statusCode = 404;
        throw e;
      }
      const cost = Math.abs(Number(reward.miles_cost) || 0);
      if (cost <= 0) {
        const e = new Error('Reward belum bisa ditukar.');
        e.statusCode = 400;
        throw e;
      }

      const userRow = await dbGet(`SELECT miles FROM users WHERE id = ? LIMIT 1`, [req.user.id]);
      const currentMiles = Number(userRow?.miles) || 0;
      if (currentMiles < cost) {
        const e = new Error('Miles kamu tidak cukup untuk menukar reward ini.');
        e.statusCode = 400;
        throw e;
      }

      let voucherCode = null;
      let voucherId = null;
      for (let i = 0; i < 6; i++) {
        const candidate = buildMilesVoucherCode();
        try {
          const expiresAt = Number(reward.valid_days) > 0
            ? new Date(Date.now() + Number(reward.valid_days) * 24 * 60 * 60 * 1000).toISOString()
            : null;

          const ins = await dbRun(
            `INSERT INTO miles_vouchers (voucher_code, user_id, reward_id, expires_at, idempotency_key)
             VALUES (?, ?, ?, ?, ?)`,
            [candidate, req.user.id, reward.id, expiresAt, idempotencyKey]
          );
          voucherCode = candidate;
          voucherId = ins.lastID;
          break;
        } catch (insErr) {
          if (String(insErr?.message || '').toLowerCase().includes('unique')) continue;
          throw insErr;
        }
      }

      if (!voucherCode) {
        const e = new Error('Gagal membuat voucher. Silakan coba lagi.');
        e.statusCode = 500;
        throw e;
      }

      await dbRun(`UPDATE users SET miles = COALESCE(miles, 0) - ? WHERE id = ?`, [cost, req.user.id]);
      await dbRun(
        `INSERT INTO miles_ledger (user_id, type, amount, ref_type, ref_id, note)
         VALUES (?, 'redeem', ?, 'miles_voucher', ?, ?)`,
        [req.user.id, -cost, String(voucherId), `Redeem: ${reward.title}`]
      );

      const updated = await dbGet(`SELECT miles FROM users WHERE id = ? LIMIT 1`, [req.user.id]);

      await dbRun('COMMIT');
      return res.json({
        success: true,
        message: 'Berhasil menukar Miles. Voucher masuk ke menu "Voucher Saya".',
        voucher_code: voucherCode,
        newMiles: Number(updated?.miles) || 0,
      });
    } catch (e) {
      try { await dbRun('ROLLBACK'); } catch {}
      throw e;
    }
  } catch (err) {
    const status = err?.statusCode || 500;
    if (status !== 500) return res.status(status).json({ success: false, error: err.message });
    console.error('POST /miles/redeem error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal menukar Miles.' });
  }
});

router.post('/miles/vouchers/:code/cancel', async (req, res) => {
  try {
    const code = String(req.params.code || '').trim().toUpperCase();
    if (!code) return res.status(400).json({ success: false, error: 'Kode voucher tidak valid.' });
    const reason = req.body?.reason ? String(req.body.reason).trim().slice(0, 140) : null;

    await dbRun('BEGIN IMMEDIATE');
    try {
      const row = await dbGet(
        `SELECT v.id, v.status, v.created_at, v.expires_at, r.miles_cost, r.title
         FROM miles_vouchers v
         JOIN miles_rewards r ON r.id = v.reward_id
         WHERE v.user_id = ? AND v.voucher_code = ?
         LIMIT 1`,
        [req.user.id, code]
      );
      if (!row) {
        const e = new Error('Voucher tidak ditemukan.');
        e.statusCode = 404;
        throw e;
      }
      if (row.status !== 'active') {
        const e = new Error('Voucher sudah tidak bisa dibatalkan.');
        e.statusCode = 400;
        throw e;
      }

      const withinWindow = await dbGet(
        `SELECT 1 as ok
         WHERE datetime(?) >= datetime('now', '-5 minutes')`,
        [row.created_at]
      );
      if (!withinWindow) {
        const e = new Error('Batas waktu pembatalan sudah lewat (maks 5 menit). Hubungi admin jika perlu bantuan.');
        e.statusCode = 400;
        throw e;
      }

      if (row.expires_at) {
        const expired = await dbGet(`SELECT 1 as ok WHERE datetime(?) <= datetime('now')`, [row.expires_at]);
        if (expired) {
          await dbRun(
            `UPDATE miles_vouchers SET status = 'expired' WHERE id = ? AND status = 'active'`,
            [row.id]
          );
          const e = new Error('Voucher sudah kedaluwarsa.');
          e.statusCode = 400;
          throw e;
        }
      }

      const cost = Math.abs(Number(row.miles_cost) || 0);
      await dbRun(
        `UPDATE miles_vouchers
         SET status = 'cancelled', cancelled_at = datetime('now'), cancel_reason = ?
         WHERE id = ? AND status = 'active'`,
        [reason, row.id]
      );
      await dbRun(`UPDATE users SET miles = COALESCE(miles, 0) + ? WHERE id = ?`, [cost, req.user.id]);
      await dbRun(
        `INSERT INTO miles_ledger (user_id, type, amount, ref_type, ref_id, note)
         VALUES (?, 'refund', ?, 'miles_voucher', ?, ?)`,
        [req.user.id, cost, String(row.id), `Cancel voucher: ${row.title}`]
      );

      const updated = await dbGet(`SELECT miles FROM users WHERE id = ? LIMIT 1`, [req.user.id]);
      await dbRun('COMMIT');
      res.json({
        success: true,
        message: 'Voucher dibatalkan. Miles sudah dikembalikan.',
        newMiles: Number(updated?.miles) || 0,
      });
    } catch (e) {
      try { await dbRun('ROLLBACK'); } catch {}
      throw e;
    }
  } catch (err) {
    const status = err?.statusCode || 500;
    if (status !== 500) return res.status(status).json({ success: false, error: err.message });
    console.error('POST /miles/vouchers/:code/cancel error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal membatalkan voucher.' });
  }
});

// ==========================================
// 3c. PARTNER VOUCHERS (User)
// ==========================================
router.get('/users/partner-vouchers', async (req, res) => {
  try {
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
        p.address,
        p.headline,
        p.promo_text,
        p.terms,
        p.image_url,
        p.maps_url,
        p.phone_wa,
        p.valid_until
      FROM partner_vouchers v
      INNER JOIN partners p ON p.id = v.partner_id
      WHERE v.user_id = ?
      ORDER BY datetime(v.claimed_at) DESC, v.id DESC
      `,
      [req.user.id]
    );

    const now = Date.now();
    const normalized = rows.map((row) => {
      const validUntilTs = row.valid_until ? new Date(row.valid_until).getTime() : null;
      const status = row.status === 'claimed' && validUntilTs && !Number.isNaN(validUntilTs) && validUntilTs < now
        ? 'expired'
        : row.status;
      return { ...row, status };
    });

    res.json({ success: true, data: normalized });
  } catch (err) {
    console.error('GET /users/partner-vouchers error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil voucher partner.' });
  }
});

router.post('/partners/:id/claim', async (req, res) => {
  try {
    const partnerId = Number(req.params.id);
    if (!partnerId) {
      return res.status(400).json({ success: false, error: 'Partner tidak valid.' });
    }

    const partner = await dbGet(
      `SELECT id, name, valid_until, is_active FROM partners WHERE id = ? LIMIT 1`,
      [partnerId]
    );
    if (!partner || !partner.is_active) {
      return res.status(404).json({ success: false, error: 'Promo partner tidak ditemukan.' });
    }

    if (partner.valid_until) {
      const validUntil = new Date(partner.valid_until).getTime();
      if (!Number.isNaN(validUntil) && validUntil < Date.now()) {
        return res.status(400).json({ success: false, error: 'Promo partner ini sudah berakhir.' });
      }
    }

    const existing = await dbGet(
      `
      SELECT id, voucher_code, status
      FROM partner_vouchers
      WHERE user_id = ? AND partner_id = ?
      ORDER BY id DESC
      LIMIT 1
      `,
      [req.user.id, partnerId]
    );

    if (existing && existing.status !== 'expired') {
      return res.status(409).json({
        success: false,
        error: 'Promo ini sudah pernah Anda klaim.',
        data: existing,
      });
    }

    const voucherCode = buildPartnerVoucherCode(partnerId);
    const result = await dbRun(
      `
      INSERT INTO partner_vouchers (voucher_code, partner_id, user_id, status)
      VALUES (?, ?, ?, 'claimed')
      `,
      [voucherCode, partnerId, req.user.id]
    );

    const created = await dbGet(
      `
      SELECT
        v.id,
        v.voucher_code,
        v.status,
        v.claimed_at,
        p.name AS partner_name,
        p.valid_until
      FROM partner_vouchers v
      INNER JOIN partners p ON p.id = v.partner_id
      WHERE v.id = ?
      `,
      [result.lastID]
    );

    res.status(201).json({
      success: true,
      message: `Promo ${partner.name} berhasil diklaim.`,
      data: created,
    });
  } catch (err) {
    console.error('POST /partners/:id/claim error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengklaim promo partner.' });
  }
});

// ==========================================
// PROMO CLAIM (USER)
// ==========================================

// POST /api/promotions/:id/claim — simpan klaim promo ke user_promotions
router.post('/promotions/:id/claim', async (req, res) => {
  try {
    const promoId = req.params.id;

    const promo = await dbGet(`SELECT * FROM promotions WHERE id = ? AND is_active = 1`, [promoId]);
    if (!promo) return res.status(404).json({ success: false, error: 'Promo tidak ditemukan atau tidak aktif.' });

    if (promo.usage_limit > 0 && promo.current_usage >= promo.usage_limit) {
      return res.status(400).json({ success: false, error: 'Kuota promo ini sudah habis.' });
    }

    const existing = await dbGet(
      `SELECT id FROM user_promotions WHERE user_id = ? AND promo_id = ?`,
      [req.user.id, promoId]
    );
    if (existing) return res.status(400).json({ success: false, error: 'Kamu sudah mengklaim promo ini sebelumnya.' });

    await dbRun(
      `INSERT INTO user_promotions (user_id, promo_id) VALUES (?, ?)`,
      [req.user.id, promoId]
    );
    await dbRun(`UPDATE promotions SET current_usage = current_usage + 1 WHERE id = ?`, [promoId]);

    res.json({ success: true, message: 'Promo berhasil diklaim!', code: promo.code });
  } catch (err) {
    console.error('POST /promotions/:id/claim error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengklaim promo.' });
  }
});

// GET /api/users/promotions — ambil daftar promo yang sudah diklaim user
router.get('/users/promotions', async (req, res) => {
  try {
    const rows = await dbAll(
      `SELECT up.id, up.claimed_at, up.status,
              p.id AS promo_id, p.title, p.code, p.desc, p.tag,
              p.discount_percent, p.max_discount
       FROM user_promotions up
       JOIN promotions p ON p.id = up.promo_id
       WHERE up.user_id = ?
       ORDER BY up.claimed_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /users/promotions error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil data promo.' });
  }
});

// ==========================================
// 3b. UPLOAD BUKTI TRANSFER (USER)
// Buat entri payment_reconciliations berstatus pending
// ==========================================
router.post('/users/payments/reconciliations', (req, res) => {
  uploadUserRecon.single('proof')(req, res, async (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ success: false, error: 'Ukuran file terlalu besar. Maksimal 5MB.' });
      }
      return res.status(400).json({ success: false, error: err.message });
    }

    try {
      const { order_id, bank_name, transfer_amount, transfer_date, notes } = req.body || {};
      if (!order_id || !bank_name || !transfer_amount || !transfer_date) {
        return res.status(400).json({ success: false, error: 'Order ID, bank, nominal, dan tanggal transfer wajib diisi.' });
      }

      const orderId = String(order_id).trim();
      const booking = await dbGet(
        `SELECT order_id, user_id, total_price, payment_status
         FROM bookings WHERE order_id = ? LIMIT 1`,
        [orderId]
      );
      if (!booking) {
        return res.status(404).json({ success: false, error: 'Order ID tidak ditemukan.' });
      }
      if (booking.user_id !== req.user.id) {
        return res.status(403).json({ success: false, error: 'Akses ditolak.' });
      }
      if (booking.payment_status === 'paid') {
        return res.status(400).json({ success: false, error: 'Pesanan ini sudah lunas.' });
      }

      const existingPending = await dbGet(
        `SELECT id FROM payment_reconciliations
         WHERE order_id = ? AND status = 'pending'
         ORDER BY created_at DESC LIMIT 1`,
        [orderId]
      );
      if (existingPending) {
        return res.status(409).json({
          success: false,
          error: 'Bukti transfer untuk pesanan ini sudah pernah diunggah dan sedang ditinjau.',
        });
      }

      let proofUrl = null;
      if (req.file) {
        const ext = mimeToExt(req.file.mimetype);
        if (!ext) {
          return res.status(400).json({ success: false, error: 'Tipe file tidak diizinkan.' });
        }
        const rand = crypto.randomBytes(10).toString('hex');
        const filename = `user-recon-${Date.now()}-${rand}${ext}`;

        const uploaded = await uploadBufferToStorage({
          buffer: req.file.buffer,
          filename,
          folder: '/reconciliations',
          localDir: 'uploads/reconciliations',
        });

        proofUrl = uploaded.url;
      }

      const amount = parseInt(transfer_amount, 10);
      if (!Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({ success: false, error: 'Nominal transfer tidak valid.' });
      }

      const bank = String(bank_name).trim();
      const date = String(transfer_date).trim();

      const result = await dbRun(
        `INSERT INTO payment_reconciliations (order_id, bank_name, transfer_amount, transfer_date, proof_url, notes)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [orderId, bank, amount, date, proofUrl, notes || null]
      );

      // Notifikasi ke admin via Telegram (best-effort, tidak block response)
      try {
        const bookingRow = await dbGet(`SELECT item_type, item_name, plate_number FROM bookings WHERE order_id = ? LIMIT 1`, [orderId]);
        const userRow    = await dbGet(`SELECT name, phone FROM users WHERE id = ? LIMIT 1`, [req.user.id]);
        notifyPaymentProofUploaded(
          { order_id: orderId, bank_name: bank, transfer_amount: amount, transfer_date: date },
          bookingRow,
          userRow,
        );
      } catch (_) { /* silent — jangan gagalkan response karena notif gagal */ }

      res.status(201).json({
        success: true,
        message: 'Bukti transfer berhasil diunggah. Tim admin akan memverifikasi secepatnya.',
        id: result.lastID,
        proof_url: proofUrl,
        recon_status: 'pending',
      });
    } catch (e) {
      console.error('POST /users/payments/reconciliations error:', e.message);
      res.status(500).json({ success: false, error: 'Gagal mengunggah bukti transfer.' });
    }
  });
});

// ==========================================
// 4. RIWAYAT PERJALANAN USER
// ==========================================
router.get('/users/history', async (req, res) => {
  try {
    const rows = await dbAll(
      `SELECT b.order_id, b.item_type, b.item_name, b.location, b.start_date, b.end_date,
              b.status, b.payment_status, b.payment_method, b.total_price, b.base_price,
              b.discount_amount, b.service_fee, b.extend_fee, b.addon_fee, b.delivery_fee,
              b.paid_amount, b.duration_hours, b.price_notes, b.created_at,
              u.name as user_name, u.phone as user_phone
       FROM bookings b
       LEFT JOIN users u ON b.user_id = u.id
       WHERE b.user_id = ?
       ORDER BY datetime(COALESCE(b.created_at, b.start_date)) DESC, datetime(b.start_date) DESC`,
      [req.user.id]
    );

    const formatted = rows.map((booking) => {
      const calcTotal =
        (Number(booking.base_price) || 0) -
        (Number(booking.discount_amount) || 0) +
        (Number(booking.service_fee) || 0) +
        (Number(booking.extend_fee) || 0) +
        (Number(booking.addon_fee) || 0) +
        (Number(booking.delivery_fee) || 0);

      const totalPrice = calcTotal > 0 ? calcTotal : (Number(booking.total_price) || 0);
      const outstandingAmount = booking.payment_status === 'paid'
        ? 0
        : Math.max(0, totalPrice - (Number(booking.paid_amount) || 0));

      return {
        ...booking,
        total_price: totalPrice,
        outstanding_amount: outstandingAmount,
      };
    });

    res.json({ success: true, data: formatted });
  } catch (err) {
    console.error('GET /users/history error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil riwayat perjalanan.' });
  }
});

// ==========================================
// 4. SUPPORT TICKETS
// ==========================================
router.post('/support/tickets', async (req, res) => {
  try {
    const { order_id, subject, message } = req.body || {};

    if (!subject || !message) {
      return res.status(400).json({ success: false, error: 'Subjek dan pesan wajib diisi.' });
    }

    if (subject.trim().length < 3) {
      return res.status(400).json({ success: false, error: 'Subjek minimal 3 karakter.' });
    }

    if (message.trim().length < 10) {
      return res.status(400).json({ success: false, error: 'Pesan minimal 10 karakter.' });
    }

    const ticketNumber = `TKT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    await dbRun(
      `INSERT INTO support_tickets (ticket_number, user_id, order_id, subject, message, status) VALUES (?, ?, ?, ?, ?, ?)`,
      [ticketNumber, req.user.id, order_id || null, subject.trim(), message.trim(), 'pending']
    );

    res.status(201).json({ success: true, ticket_number: ticketNumber });

  } catch (err) {
    console.error('POST /support/tickets error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal membuat tiket support.' });
  }
});

// ==========================================
// 5. CREATE BOOKING (MOTOR / LOKER / MOBIL)
// ==========================================
router.post('/bookings', async (req, res) => {
  try {
    const { 
      order_id, item_type, item_name, location, start_date, end_date, total_price,
      base_price, discount_amount, promo_code, service_fee, addon_fee, delivery_fee,
      basePrice, discountAmount, promoCode, serviceFee, addonFee, deliveryFee,
      duration_hours, price_notes, payment_method,
      addon_items,
      delivery_type, delivery_station_id, delivery_address, delivery_lat, delivery_lng,
      trip_scope, trip_destination,
      car_id
    } = req.body || {};

    if (!order_id || !item_type || !item_name || !start_date || !end_date || !total_price) {
      return res.status(400).json({ success: false, error: 'Data booking tidak lengkap.' });
    }

    if (!['motor', 'locker', 'car'].includes(item_type)) {
      return res.status(400).json({ success: false, error: 'Tipe item tidak valid.' });
    }

    let finalPrice = parseInt(total_price);
    if (isNaN(finalPrice) || finalPrice <= 0) {
      return res.status(400).json({ success: false, error: 'Total harga tidak valid.' });
    }

    let refPrice = null;
    let rentalBreakdown = null;
    let resolvedItemName = item_name;
    let assignedUnitId = null;
    let assignedPlateNumber = null;

    if (item_type === 'motor') {
      const motor = await dbGet(
        `SELECT base_price, price_12h FROM motors WHERE name = ? LIMIT 1`,
        [item_name]
      );
      if (motor) {
        const settings = await dbGet(
          `SELECT motor_billing_mode, motor_threshold_12h
           FROM booking_pricing_settings WHERE id = 1`
        );

        refPrice = motor.base_price;
        rentalBreakdown = calculateMotorRentalBreakdown({
          startDate: start_date,
          endDate: end_date,
          price24h: motor.base_price,
          price12h: motor.price_12h || 0,
          billingMode: settings?.motor_billing_mode || 'calendar',
          threshold12h: settings?.motor_threshold_12h || 12,
        });

        if (!rentalBreakdown.isValid) {
          return res.status(400).json({ success: false, error: rentalBreakdown.error });
        }
      }
    } else if (item_type === 'locker') {
      const locker = await dbGet(
        `SELECT base_price FROM lockers WHERE location = ? LIMIT 1`,
        [location]
      );
      if (locker) refPrice = locker.base_price;
    } else if (item_type === 'car') {
      const carId = parseInt(car_id, 10) || null;
      const car = carId
        ? await dbGet(`SELECT id, name, display_name, base_price FROM cars WHERE id = ? LIMIT 1`, [carId])
        : await dbGet(
          `SELECT id, name, display_name, base_price
           FROM cars
           WHERE lower(name) = lower(?)
              OR lower(COALESCE(display_name, '')) = lower(?)
           LIMIT 1`,
          [item_name, item_name]
        );

      if (!car) {
        return res.status(400).json({ success: false, error: 'Mobil tidak ditemukan.' });
      }
      resolvedItemName = car.display_name || car.name;
      refPrice = car.base_price;
    }

    if (refPrice !== null) {
      const startDt   = new Date(start_date);
      const endDt     = new Date(end_date);
      const days      = Math.max(1, Math.ceil((endDt - startDt) / (1000 * 60 * 60 * 24)));
      const dayUnits  = rentalBreakdown?.billableDayUnits || days;
      const minPrice  = Math.floor(refPrice * dayUnits * 0.2); 

      if (finalPrice < minPrice) {
        return res.status(400).json({
          success: false,
          error: `Total harga tidak masuk akal. Minimum Rp ${minPrice.toLocaleString('id-ID')} untuk durasi ini.`,
        });
      }
    }

    const startDt = new Date(start_date);
    const endDt   = new Date(end_date);
    if (isNaN(startDt.getTime()) || isNaN(endDt.getTime())) {
      return res.status(400).json({ success: false, error: 'Format tanggal tidak valid.' });
    }
    if (endDt <= startDt) {
      return res.status(400).json({ success: false, error: 'Tanggal selesai harus setelah tanggal mulai.' });
    }

    const user = await dbGet(`SELECT kyc_status FROM users WHERE id = ?`, [req.user.id]);
    if (!user || user.kyc_status !== 'verified') {
      return res.status(403).json({
        success: false,
        error: 'Anda harus melakukan verifikasi data (KYC) terlebih dahulu sebelum membuat pesanan.'
      });
    }

    const existing = await dbGet(`SELECT order_id FROM bookings WHERE order_id = ?`, [order_id]);
    if (existing) {
      return res.status(409).json({ success: false, error: 'Order ID sudah digunakan.' });
    }

    const bPrice  = rentalBreakdown?.baseTotal || parseInt(base_price || basePrice) || finalPrice; 
    let dAmount = parseInt(discount_amount || discountAmount) || 0;
    const sFee    = parseInt(service_fee || serviceFee) || 0;
    const pCodeRaw = promo_code || promoCode || null;
    const pCode = pCodeRaw ? String(pCodeRaw).trim().toUpperCase() : null;
    const billableHours = rentalBreakdown?.billableHours || parseInt(duration_hours) || 0;

    // Miles voucher (akun-bound) — hitung diskon di server agar anti manipulasi.
    // Promo biasa (promotions table) tetap mengikuti flow lama.
    let milesVoucher = null;
    if (pCode) {
      const v = await dbGet(
        `SELECT v.id, v.user_id, v.status, v.expires_at,
                r.reward_type, r.discount_percent, r.max_discount, r.discount_amount, r.min_order_amount, r.allowed_item_types
         FROM miles_vouchers v
         JOIN miles_rewards r ON r.id = v.reward_id
         WHERE v.voucher_code = ?
           AND r.is_active = 1
         LIMIT 1`,
        [pCode]
      ).catch(() => null);

      if (v) {
        if (v.user_id !== req.user.id) {
          return res.status(403).json({ success: false, error: 'Voucher ini tidak bisa digunakan oleh akun kamu.' });
        }
        if (v.status !== 'active') {
          return res.status(400).json({ success: false, error: 'Voucher sudah tidak aktif.' });
        }
        if (v.expires_at) {
          const expired = await dbGet(`SELECT 1 as ok WHERE datetime(?) <= datetime('now')`, [v.expires_at]);
          if (expired) {
            db.run(`UPDATE miles_vouchers SET status = 'expired' WHERE id = ? AND status = 'active'`, [v.id]);
            return res.status(400).json({ success: false, error: 'Voucher sudah kedaluwarsa.' });
          }
        }

        const allowed = parseAllowedItemTypes(v.allowed_item_types);
        if (allowed.length > 0 && !allowed.includes(String(item_type || '').toLowerCase())) {
          return res.status(400).json({ success: false, error: 'Voucher ini tidak berlaku untuk jenis booking ini.' });
        }

        const minOrder = Math.max(0, parseInt(v.min_order_amount, 10) || 0);
        if (minOrder > 0 && Number(bPrice) < minOrder) {
          return res.status(400).json({
            success: false,
            error: `Minimum transaksi untuk voucher ini adalah Rp ${minOrder.toLocaleString('id-ID')}.`,
          });
        }

        const rewardType = String(v.reward_type || 'percent').toLowerCase();
        if (rewardType === 'fixed') {
          const amt = Math.max(0, parseInt(v.discount_amount, 10) || 0);
          dAmount = Math.max(0, Math.min(Number(bPrice) || 0, amt));
        } else {
          const pct = Math.max(0, Math.min(100, parseInt(v.discount_percent, 10) || 0));
          const max = Math.max(0, parseInt(v.max_discount, 10) || 0);
          const raw = Math.floor((Number(bPrice) * pct) / 100);
          const capped = max > 0 ? Math.min(raw, max) : raw;
          dAmount = Math.max(0, Math.min(Number(bPrice) || 0, capped));
        }
        milesVoucher = { id: v.id, code: pCode };
      }
    }

    // Add-ons motor: compute on server (source of truth)
    // Untuk sementara, addon_fee dari client diabaikan (anti-manipulasi).
    let aFee = 0;
    const addonLines = [];
    const addonItems = Array.isArray(addon_items) ? addon_items : [];

    if (item_type === 'motor' && addonItems.length > 0) {
      for (const raw of addonItems) {
        const addonId = parseInt(raw?.id, 10);
        if (!addonId) {
          return res.status(400).json({ success: false, error: 'Add-on tidak valid.' });
        }

        const row = await dbGet(
          `SELECT id, name, addon_type, price, allow_quantity, max_qty
           FROM motor_addons
           WHERE id = ? AND is_active = 1
           LIMIT 1`,
          [addonId]
        );

        if (!row) {
          return res.status(400).json({ success: false, error: 'Ada add-on yang tidak tersedia.' });
        }

        const allowQty = parseInt(row.allow_quantity, 10) === 1;
        const maxQty = Math.max(1, parseInt(row.max_qty, 10) || 1);
        const requestedQty = parseInt(raw?.qty, 10) || 1;
        const qty = allowQty ? Math.max(1, Math.min(maxQty, requestedQty)) : 1;

        const unitPrice = Math.max(0, parseInt(row.price, 10) || 0);
        const lineTotal = unitPrice * qty;
        // Penting untuk operasional: add-on gratis (0 rupiah) tetap disimpan
        // agar bisa dipakai untuk info perlengkapan (helm/jas hujan) di modul logistics.
        if (lineTotal > 0) aFee += lineTotal;
        addonLines.push({
          addon_id: row.id,
          name_snapshot: row.name,
          addon_type_snapshot: row.addon_type || 'addon',
          qty,
          unit_price: unitPrice,
          total_price: lineTotal,
        });
      }
    }

    // Delivery fee: compute on server (source of truth)
    let delFee = parseInt(delivery_fee || deliveryFee) || 0;
    let deliveryDistanceKm = null;
    let deliveryMethod = null;
    const delType = delivery_type ? String(delivery_type) : null;

    if ((item_type === 'motor' || item_type === 'car') && delType && delType !== 'self') {
      const q = await quoteDelivery({
        city: location,
        target: delType === 'station'
          ? { type: 'station', station_id: delivery_station_id || null }
          : { type: 'address', lat: delivery_lat, lng: delivery_lng, address: delivery_address || null },
      });

      if (!q.ok) {
        return res.status(400).json({ success: false, error: q.error || 'Data pengantaran tidak valid.' });
      }

      delFee = q.fee;
      deliveryDistanceKm = q.distance_km;
      deliveryMethod = q.method;
    }

	    finalPrice = Math.max(0, bPrice - dAmount + sFee + aFee + delFee);
	    const payMethod = payment_method || req.body.payment_method || 'transfer';
	    const computedPriceNotes = rentalBreakdown
	      ? `Motor billing ${rentalBreakdown.packageSummary}`
	      : (price_notes || null);

	    const tripScopeNormalized =
	      trip_scope === 'out_of_town' ? 'out_of_town'
	      : trip_scope === 'local' ? 'local'
	      : 'local';
	    const tripDestinationNormalized = trip_destination
	      ? String(trip_destination).trim().slice(0, 140)
	      : null;
	    if ((item_type === 'motor' || item_type === 'car') && !tripDestinationNormalized) {
	      return res.status(400).json({ success: false, error: 'Tujuan pemakaian wajib diisi.' });
	    }

    const bufferMinutes = parseInt(process.env.UNIT_TURNAROUND_MINUTES || '0', 10) || 0;
    const startNorm = normalizeToSqliteDateTime(start_date);
    const endNorm = normalizeToSqliteDateTime(end_date);
    const bufPlus = bufferMinutes > 0 ? `+${bufferMinutes} minutes` : '+0 minutes';
    const bufMinus = bufferMinutes > 0 ? `-${bufferMinutes} minutes` : '+0 minutes';

    // Atomic: booking + addon lines (+ car unit assign)
    await dbRun(item_type === 'car' ? 'BEGIN IMMEDIATE' : 'BEGIN');
    try {
      // Auto-assign unit for car booking (to prevent double-booking)
      if (item_type === 'car') {
        const carId = parseInt(car_id, 10) || null;
        if (!carId) {
          const e = new Error('car_id wajib diisi untuk booking mobil.');
          e.statusCode = 400;
          throw e;
        }
        if (!startNorm || !endNorm) {
          const e = new Error('Tanggal booking tidak valid.');
          e.statusCode = 400;
          throw e;
        }

        const pickupKey = normalizeCityKey(location);
        const preferLike = pickupKey === 'solo' ? '%solo%' : '%yogya%';

        const unit = await dbGet(
          `
          SELECT cu.id, cu.plate_number, cu.current_location
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
          const e = new Error('Mobil sedang tidak tersedia untuk rentang tanggal tersebut.');
          e.statusCode = 409;
          throw e;
        }

        assignedUnitId = unit.id;
        assignedPlateNumber = unit.plate_number || null;
      }

      await dbRun(
        `INSERT INTO bookings (
           order_id, user_id, item_type, item_name, location,
           delivery_type, delivery_station_id, delivery_address, delivery_lat, delivery_lng, delivery_distance_km, delivery_method,
           trip_scope, trip_destination,
           start_date, end_date, 
           base_price, discount_amount, promo_code, service_fee, extend_fee, addon_fee, delivery_fee,
           paid_amount, total_price, status, payment_status, payment_method, duration_hours, price_notes,
           unit_id, plate_number
         ) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, 'pending', 'unpaid', ?, ?, ?, ?, ?)`,
        [
          order_id, req.user.id, item_type, resolvedItemName, location,
          delType || null,
          delivery_station_id || null,
          delivery_address || null,
          (delivery_lat !== undefined && delivery_lat !== null && delivery_lat !== '') ? Number(delivery_lat) : null,
          (delivery_lng !== undefined && delivery_lng !== null && delivery_lng !== '') ? Number(delivery_lng) : null,
          deliveryDistanceKm !== null ? Number(deliveryDistanceKm) : null,
          deliveryMethod || null,
          tripScopeNormalized,
          tripDestinationNormalized,
          start_date, end_date, 
          bPrice, dAmount, pCode, sFee, aFee, delFee,
          0, finalPrice, payMethod, billableHours, computedPriceNotes,
          assignedUnitId, assignedPlateNumber
        ]
      );

      // Miles voucher: consume (mark used) in the same transaction as booking
      if (milesVoucher) {
        const used = await dbRun(
          `UPDATE miles_vouchers
           SET status = 'used', used_at = datetime('now'), used_order_id = ?
           WHERE id = ? AND user_id = ? AND status = 'active'`,
          [order_id, milesVoucher.id, req.user.id]
        );
        if (!used || used.changes === 0) {
          const e = new Error('Voucher gagal digunakan. Silakan coba lagi.');
          e.statusCode = 409;
          throw e;
        }
      }

      if (item_type === 'motor' && addonLines.length > 0) {
        for (const line of addonLines) {
          await dbRun(
            `INSERT INTO booking_motor_addons
              (order_id, addon_id, name_snapshot, addon_type_snapshot, qty, unit_price, total_price)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              order_id,
              line.addon_id,
              line.name_snapshot,
              line.addon_type_snapshot,
              line.qty,
              line.unit_price,
              line.total_price,
            ]
          );
        }
      }

      await dbRun('COMMIT');
    } catch (e) {
      try { await dbRun('ROLLBACK'); } catch {}
      throw e;
    }

    dbGet(`SELECT name, phone FROM users WHERE id = ?`, [req.user.id])
      .then((userData) => notifyNewBooking(
        {
          order_id,
          item_type,
          item_name: resolvedItemName,
          location,
          start_date,
          end_date,
          total_price: finalPrice,
          payment_method: payMethod,
          plate_number: assignedPlateNumber,
          trip_scope: tripScopeNormalized,
          trip_destination: tripDestinationNormalized,
          delivery_type: delType,
          delivery_address: delivery_address || null,
          delivery_distance_km: deliveryDistanceKm,
          delivery_method: deliveryMethod,
          delivery_station_id: delivery_station_id || null,
        },
        userData
      ))
      .catch((err) => console.error('[Telegram] booking notify error:', err.message));

    res.status(201).json({ success: true, message: 'Booking berhasil dibuat.', order_id });

  } catch (err) {
    const status = err?.statusCode || 500;
    if (status !== 500) {
      return res.status(status).json({ success: false, error: err.message || 'Gagal membuat booking.' });
    }
    console.error('POST /bookings error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal membuat booking.' });
  }
});

// ==========================================
// 5b. GET BOOKING DETAIL (USER)
// ==========================================
router.get('/bookings/:orderId', async (req, res) => {
  try {
    const orderId = req.params.orderId;
    if (!orderId) return res.status(400).json({ success: false, error: 'Order ID wajib diisi.' });

    const row = await dbGet(
      `SELECT b.order_id, b.user_id, b.item_type, b.item_name, b.location, b.start_date, b.end_date,
              b.delivery_type, b.delivery_station_id, b.delivery_address, b.delivery_lat, b.delivery_lng, b.delivery_distance_km, b.delivery_method,
              b.trip_scope, b.trip_destination,
              b.base_price, b.discount_amount, b.promo_code, b.service_fee, b.extend_fee, b.addon_fee, b.delivery_fee,
              b.paid_amount, b.total_price, b.status, b.payment_status, b.payment_method, b.duration_hours, b.price_notes,
              b.unit_id, b.plate_number, b.created_at,
              r.status AS recon_status, r.bank_name AS recon_bank, r.transfer_date AS recon_transfer_date
       FROM bookings b
       LEFT JOIN (
         SELECT order_id, status, bank_name, transfer_date
         FROM payment_reconciliations
         WHERE order_id = ?
         ORDER BY created_at DESC LIMIT 1
       ) r ON r.order_id = b.order_id
       WHERE b.order_id = ? AND b.user_id = ?
       LIMIT 1`,
      [orderId, orderId, req.user.id]
    );

    if (!row) {
      return res.status(404).json({ success: false, error: 'Pesanan tidak ditemukan.' });
    }

    const calcTotal =
      (Number(row.base_price) || 0) -
      (Number(row.discount_amount) || 0) +
      (Number(row.service_fee) || 0) +
      (Number(row.extend_fee) || 0) +
      (Number(row.addon_fee) || 0) +
      (Number(row.delivery_fee) || 0);

    const totalPrice = calcTotal > 0 ? calcTotal : (Number(row.total_price) || 0);
    const outstandingAmount = row.payment_status === 'paid'
      ? 0
      : Math.max(0, totalPrice - (Number(row.paid_amount) || 0));

    let addons = [];
    try {
      if (row.item_type === 'motor') {
        addons = await dbAll(
          `SELECT addon_id as id, name_snapshot as name, addon_type_snapshot as addon_type, qty, unit_price, total_price
           FROM booking_motor_addons
           WHERE order_id = ?
           ORDER BY id ASC`,
          [row.order_id]
        );
      }
    } catch {
      addons = [];
    }

    res.json({
      success: true,
      data: {
        ...row,
        total_price: totalPrice,
        outstanding_amount: outstandingAmount,
        addons,
      },
    });
  } catch (err) {
    console.error('GET /bookings/:orderId error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil detail pesanan.' });
  }
});

// ==========================================
// 6. KYC — Update Status & Verify Code
// ==========================================
router.put('/users/kyc', async (req, res) => {
  try {
    const { status } = req.body || {};
    const validStatuses = ['unverified', 'pending'];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: 'Status KYC tidak valid.' });
    }

    await dbRun(`UPDATE users SET kyc_status = ? WHERE id = ?`, [status, req.user.id]);

    if (status === 'pending') {
      dbGet(`SELECT name, email, phone FROM users WHERE id = ?`, [req.user.id])
        .then((userData) => notifyKycPending(userData))
        .catch((err) => console.error('[Telegram] KYC notify error:', err.message));
    }

    res.json({ success: true, message: 'Status KYC berhasil diupdate.' });

  } catch (err) {
    console.error('PUT /users/kyc error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengupdate status KYC.' });
  }
});

router.post('/users/kyc/verify', async (req, res) => {
  try {
    const { code } = req.body || {};

    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Kode verifikasi wajib diisi.' });
    }

    const user = await dbGet(`SELECT kyc_code, kyc_status FROM users WHERE id = ?`, [req.user.id]);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User tidak ditemukan.' });
    }

    if (user.kyc_status === 'verified') {
      return res.status(400).json({ success: false, error: 'Akun Anda sudah terverifikasi.' });
    }

    if (!user.kyc_code) {
      return res.status(400).json({ success: false, error: 'Admin belum membuatkan kode verifikasi untuk Anda.' });
    }

    if (user.kyc_code !== code.trim().toUpperCase()) {
      return res.status(400).json({ success: false, error: 'Kode verifikasi tidak valid.' });
    }

    await dbRun(
      `UPDATE users SET kyc_status = 'verified', kyc_code = NULL WHERE id = ?`,
      [req.user.id]
    );

    res.json({ success: true, message: 'Akun berhasil diverifikasi.' });

  } catch (err) {
    console.error('POST /users/kyc/verify error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal memverifikasi akun.' });
  }
});

// ==========================================
// 7. EXTEND BOOKING
// ==========================================
router.put('/bookings/:orderId/extend', async (req, res) => {
  try {
    const { additional_days } = req.body || {};
    const orderId = req.params.orderId;

    const days = parseInt(additional_days);
    if (!days || days < 1 || days > 30) {
      return res.status(400).json({ success: false, error: 'Jumlah hari tambahan harus antara 1-30.' });
    }

    const booking = await dbGet(
      `SELECT order_id, item_type, item_name, plate_number, start_date, end_date, total_price, base_price, status
       FROM bookings WHERE order_id = ? AND user_id = ?`,
      [orderId, req.user.id]
    );

    if (!booking) {
      return res.status(404).json({ success: false, error: 'Pesanan tidak ditemukan.' });
    }

    if (booking.status !== 'active') {
      return res.status(400).json({ success: false, error: 'Hanya pesanan aktif yang bisa diperpanjang.' });
    }

    const start      = new Date(booking.start_date);
    const currentEnd = new Date(booking.end_date);
    const currentDays = Math.max(1, Math.ceil((currentEnd - start) / (1000 * 60 * 60 * 24)));

    const MAX_TOTAL_DAYS = 90;
    if (currentDays + days > MAX_TOTAL_DAYS) {
      const remainingAllowed = MAX_TOTAL_DAYS - currentDays;
      if (remainingAllowed <= 0) {
        return res.status(400).json({
          success: false,
          error: `Booking sudah mencapai batas maksimum ${MAX_TOTAL_DAYS} hari. Tidak bisa diperpanjang lagi.`,
        });
      }
      return res.status(400).json({
        success: false,
        error: `Maksimum total sewa ${MAX_TOTAL_DAYS} hari. Kamu hanya bisa menambah ${remainingAllowed} hari lagi.`,
      });
    }

    const pricePerDay = Math.round((booking.base_price || booking.total_price) / currentDays);
    const extraCost   = days * pricePerDay;

    currentEnd.setDate(currentEnd.getDate() + days);
    const newEndDate = currentEnd.toISOString().split('T')[0];

    await dbRun(
      `UPDATE bookings 
       SET end_date = ?, 
           total_price = total_price + ?, 
           extend_fee = IFNULL(extend_fee, 0) + ?, 
           payment_status = 'unpaid' 
       WHERE order_id = ?`,
      [newEndDate, extraCost, extraCost, orderId]
    );

    dbGet(`SELECT name, phone FROM users WHERE id = ?`, [req.user.id])
      .then((userData) => notifyExtendBooking(booking, userData, newEndDate, extraCost))
      .catch((err) => console.error('[Telegram] extend notify error:', err.message));

    res.json({ success: true, new_end_date: newEndDate, extra_cost: extraCost });

  } catch (err) {
    console.error('PUT /bookings/:orderId/extend error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal memperpanjang booking.' });
  }
});

// ==========================================
// 8. CLAIM GAMIFICATION MILES
// ==========================================
router.post('/claim-tc-miles', async (req, res) => {
  try {
    const MILES_REWARD = 50;

    const result = await dbRun(
      `UPDATE users 
       SET miles = COALESCE(miles, 0) + ?,
           has_completed_tc_gamification = 1
       WHERE id = ? AND COALESCE(has_completed_tc_gamification, 0) = 0`,
      [MILES_REWARD, req.user.id]
    );

    if (result.changes === 0) {
      const user = await dbGet(`SELECT has_completed_tc_gamification FROM users WHERE id = ?`, [req.user.id]);
      if (!user) {
        return res.status(404).json({ success: false, error: 'User tidak ditemukan.' });
      }
      return res.status(400).json({ success: false, error: 'Anda sudah mengklaim hadiah misi ini sebelumnya.' });
    }

    const updated = await dbGet(`SELECT miles FROM users WHERE id = ?`, [req.user.id]);

    res.json({
      success: true,
      message: `${MILES_REWARD} Miles berhasil ditambahkan!`,
      miles:   updated?.miles || 0,
    });

  } catch (err) {
    console.error('POST /claim-tc-miles error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengklaim miles.' });
  }
});

// ==========================================
// GMAPS REVIEW
// ==========================================
const ALLOWED_REVIEW_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const uploadReview = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    ALLOWED_REVIEW_TYPES.includes(file.mimetype)
      ? cb(null, true)
      : cb(new Error('Hanya JPG/PNG/WebP yang diizinkan.'));
  },
});

router.get('/reviews/gmaps/status', async (req, res) => {
  try {
    const userData = await dbGet('SELECT has_reviewed_gmaps FROM users WHERE id = ?', [req.user.id]);
    const latestReview = await dbGet(
      'SELECT status, reject_reason, submitted_at, miles_awarded FROM gmaps_reviews WHERE user_id = ? ORDER BY submitted_at DESC LIMIT 1',
      [req.user.id]
    );
    res.json({
      success: true,
      data: {
        has_reviewed:  userData && userData.has_reviewed_gmaps === 1,
        latest_review: latestReview || null,
      },
    });
  } catch (err) {
    console.error('GET /reviews/gmaps/status error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil status review.' });
  }
});

router.post('/reviews/gmaps', function(req, res) {
  uploadReview.single('screenshot')(req, res, async function(err) {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ success: false, error: 'Ukuran file maksimal 5MB.' });
      return res.status(400).json({ success: false, error: err.message });
    }
    try {
      if (!req.file) return res.status(400).json({ success: false, error: 'Screenshot wajib diunggah.' });

      const userData = await dbGet('SELECT has_reviewed_gmaps FROM users WHERE id = ?', [req.user.id]);
      if (userData && userData.has_reviewed_gmaps === 1) {
        return res.status(400).json({ success: false, error: 'Kamu sudah pernah mendapatkan reward review Google Maps.' });
      }

      const pending = await dbGet(
        'SELECT id FROM gmaps_reviews WHERE user_id = ? AND status = ?',
        [req.user.id, 'pending']
      );
      if (pending) {
        return res.status(400).json({ success: false, error: 'Kamu sudah memiliki submission yang sedang ditinjau admin.' });
      }

      var order_id = (req.body || {}).order_id || null;
      const ext = mimeToExt(req.file.mimetype) || '.jpg';
      const filename = 'review-' + crypto.randomBytes(12).toString('hex') + ext;
      const stored = await uploadBufferToStorage({
        buffer:   req.file.buffer,
        filename,
        folder:   'reviews',
        localDir: path.join(__dirname, '..', 'uploads', 'reviews'),
      });
      var screenshotUrl = stored.url;

      var result = await dbRun(
        'INSERT INTO gmaps_reviews (user_id, order_id, screenshot_url) VALUES (?, ?, ?)',
        [req.user.id, order_id, screenshotUrl]
      );

      dbGet('SELECT name, phone FROM users WHERE id = ?', [req.user.id])
        .then(function(ud) { return notifyGmapsReview({ id: result.lastID, order_id: order_id, screenshot_url: screenshotUrl }, ud); })
        .catch(function(e) { console.error('[Telegram] gmaps review notify error:', e.message); });

      res.status(201).json({
        success: true,
        message: 'Screenshot berhasil dikirim. Admin akan memverifikasi dalam 1x24 jam.',
        review_id: result.lastID,
      });
    } catch (err) {
      console.error('POST /reviews/gmaps error:', err.message);
      res.status(500).json({ success: false, error: 'Gagal mengirim review.' });
    }
  });
});

module.exports = router;
