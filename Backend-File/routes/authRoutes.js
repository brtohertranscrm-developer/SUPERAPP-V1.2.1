/**
 * authRoutes.js — Brother Trans
 * ===============================
 * [FIX 1] JWT Revoke Mechanism:
 *   - Token blacklist disimpan di tabel token_blacklist (SQLite)
 *   - Logout menyimpan hash token ke blacklist
 *   - authMiddleware.js perlu dicek blacklist saat verifikasi token
 *   - Cleanup otomatis token expired via setInterval setiap 1 jam
 */

'use strict';

const express  = require('express');
const router   = express.Router();
const bcrypt   = require('bcrypt');
const jwt      = require('jsonwebtoken');
const crypto   = require('crypto');
const db       = require('../db');
const REFERRAL_CONFIG = require('../utils/referralConfig');
require('dotenv').config();

// ─── Konstanta ────────────────────────────────────────────────────────────────
const JWT_SECRET       = process.env.JWT_SECRET;
const BCRYPT_ROUNDS    = 12;
const JWT_EXPIRY       = '8h';
const MAX_LOGIN_FAILS  = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000;        // ms — untuk locked_until (dibandingkan Date.now() ms)
// [FIX P1] Reset token TTL dalam DETIK bukan ms
// SQLite INTEGER max = 2^63 tapi SQLite3 Node.js pakai JS Number (max safe = 2^53)
// Date.now() ms (~1.7 triliun) aman, tapi simpan dalam detik lebih konvensional
// dan menghindari potensi float conversion saat read/write
const RESET_TOKEN_TTL_SEC = 60 * 60; // 1 jam dalam detik

if (!JWT_SECRET) {
  console.error('❌ FATAL: JWT_SECRET belum di-set di .env. Server akan exit.');
  process.exit(1);
}

// ─── Rate Limiting ────────────────────────────────────────────────────────────
let rateLimit, ipKeyGenerator;
try {
  const rl      = require('express-rate-limit');
  rateLimit     = rl.rateLimit || rl.default || rl;
  ipKeyGenerator = rl.ipKeyGenerator || null;
} catch {
  console.warn('⚠️  express-rate-limit belum terinstall. Jalankan: npm install express-rate-limit');
  rateLimit     = (opts) => (req, res, next) => next();
  ipKeyGenerator = null;
}

const makeKeyGen = () => {
  if (ipKeyGenerator) return ipKeyGenerator;
  return undefined;
};

const baseRateOpts = (extra = {}) => ({
  standardHeaders: true,
  legacyHeaders:   false,
  ...(makeKeyGen() ? { keyGenerator: makeKeyGen() } : {}),
  ...extra,
});

const loginLimiter = rateLimit(baseRateOpts({
  windowMs:               15 * 60 * 1000,
  max:                    10,
  skipSuccessfulRequests: true,
  message: { success: false, error: 'Terlalu banyak percobaan login. Coba lagi dalam 15 menit.' },
}));

const forgotLimiter = rateLimit(baseRateOpts({
  windowMs: 60 * 60 * 1000,
  max:      5,
  message:  { success: false, error: 'Terlalu banyak permintaan reset password. Coba lagi dalam 1 jam.' },
}));

const registerLimiter = rateLimit(baseRateOpts({
  windowMs: 60 * 60 * 1000,
  max:      10,
  message:  { success: false, error: 'Terlalu banyak percobaan registrasi. Coba lagi dalam 1 jam.' },
}));

// ─── DB Helpers ───────────────────────────────────────────────────────────────
const dbGet = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)))
  );

const dbRun = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.run(sql, params, function (err) {
      err ? reject(err) : resolve({ lastID: this.lastID, changes: this.changes });
    })
  );

// ─── Input Sanitizer ──────────────────────────────────────────────────────────
const sanitize = (str) => {
  if (typeof str !== 'string') return '';
  return str.trim().replace(/[<>"'`\\]/g, '').substring(0, 500);
};

// ─── Validators ───────────────────────────────────────────────────────────────
const isValidEmail = (email) =>
  typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);

const isValidPhone = (phone) =>
  typeof phone === 'string' && /^[0-9+\-\s()]{8,20}$/.test(phone);

// ─── Referral Code Generator ──────────────────────────────────────────────────
const generateReferralCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'BR-';
  for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
};

// ─── Login Activity Logger ────────────────────────────────────────────────────
const logLoginAttempt = async (userId, ip, userAgent, success, reason = null) => {
  try {
    await dbRun(
      `INSERT INTO login_logs (user_id, ip_address, user_agent, success, reason, attempted_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [userId || null, ip, (userAgent || '').substring(0, 500), success ? 1 : 0, reason]
    );
  } catch {
    // Log gagal tidak boleh interrupt flow login
  }
};

// ─── Account Lockout Helpers ──────────────────────────────────────────────────
const incrementLoginFails = async (userId) => {
  await dbRun(
    `UPDATE users
     SET login_attempts = login_attempts + 1,
         locked_until   = CASE
           WHEN login_attempts + 1 >= ? THEN ?
           ELSE NULL
         END
     WHERE id = ?`,
    [MAX_LOGIN_FAILS, Date.now() + LOCKOUT_DURATION, userId]
  );
};

const resetLoginFails = async (userId) => {
  await dbRun(
    `UPDATE users SET login_attempts = 0, locked_until = NULL, last_login = datetime('now') WHERE id = ?`,
    [userId]
  );
};

// ─── Tier Bonus Referral ──────────────────────────────────────────────────────
const processTierBonus = async (referrerId) => {
  const countRow = await dbGet(
    `SELECT COUNT(*) as total FROM referral_logs WHERE referrer_id = ?`,
    [referrerId]
  );
  const totalInvites = countRow?.total || 0;

  const awardedRows = await dbGet(
    `SELECT GROUP_CONCAT(tier_label) as labels
     FROM referral_logs
     WHERE referrer_id = ? AND tier_label IS NOT NULL`,
    [referrerId]
  );
  const awardedLabels = awardedRows?.labels
    ? awardedRows.labels.split(',').map((s) => s.trim())
    : [];

  let bonusAwarded = 0;
  let tierLabel    = null;

  for (const tier of REFERRAL_CONFIG.REFERRER_TIER_BONUSES) {
    if (totalInvites >= tier.threshold && !awardedLabels.includes(tier.label)) {
      await dbRun(`UPDATE users SET miles = miles + ? WHERE id = ?`, [tier.bonus, referrerId]);
      bonusAwarded = tier.bonus;
      tierLabel    = tier.label;
      console.log(`🏆 Tier bonus "${tier.label}" → referrer ${referrerId} +${tier.bonus} miles`);
      break;
    }
  }

  return { bonusAwarded, tierLabel };
};

// ─── Middleware: pastikan DB punya kolom baru ─────────────────────────────────
const ensureAuthColumns = async () => {
  const migrations = [
    `ALTER TABLE users ADD COLUMN login_attempts INTEGER DEFAULT 0`,
    `ALTER TABLE users ADD COLUMN locked_until   INTEGER DEFAULT NULL`,
    `ALTER TABLE users ADD COLUMN last_login      TEXT    DEFAULT NULL`,
    `CREATE TABLE IF NOT EXISTS login_logs (
       id           INTEGER PRIMARY KEY AUTOINCREMENT,
       user_id      TEXT,
       ip_address   TEXT,
       user_agent   TEXT,
       success      INTEGER DEFAULT 0,
       reason       TEXT,
       attempted_at TEXT DEFAULT (datetime('now'))
     )`,
    // [FIX 1] Tabel token blacklist
    `CREATE TABLE IF NOT EXISTS token_blacklist (
       id             INTEGER PRIMARY KEY AUTOINCREMENT,
       token_hash     TEXT UNIQUE NOT NULL,
       user_id        TEXT NOT NULL,
       blacklisted_at TEXT DEFAULT (datetime('now')),
       expires_at     INTEGER NOT NULL
     )`,
  ];
  for (const sql of migrations) {
    try { await dbRun(sql); } catch { /* kolom/tabel sudah ada, skip */ }
  }
};
ensureAuthColumns().catch(console.error);

// ─── [FIX 1] JWT Blacklist Helpers ───────────────────────────────────────────
// Hash token sebelum simpan ke DB — agar token asli tidak tersimpan di server
const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

// Tambahkan token ke blacklist saat logout
const blacklistToken = async (token, userId, expiresAt) => {
  const tokenHash = hashToken(token);
  try {
    await dbRun(
      `INSERT OR IGNORE INTO token_blacklist (token_hash, user_id, expires_at)
       VALUES (?, ?, ?)`,
      [tokenHash, userId, expiresAt]
    );
  } catch (err) {
    console.error('Blacklist token error:', err.message);
  }
};

// Cek apakah token sudah di-blacklist (dipanggil dari authMiddleware)
const isTokenBlacklisted = async (token) => {
  const tokenHash = hashToken(token);
  const row = await dbGet(
    `SELECT id FROM token_blacklist WHERE token_hash = ? AND expires_at > ?`,
    [tokenHash, Date.now()]
  );
  return !!row;
};

// Cleanup token blacklist yang sudah expired — jalan setiap 1 jam
const cleanupBlacklist = async () => {
  try {
    const result = await dbRun(
      `DELETE FROM token_blacklist WHERE expires_at <= ?`,
      [Date.now()]
    );
    if (result.changes > 0) {
      console.log(`🧹 Token blacklist cleanup: ${result.changes} token expired dihapus.`);
    }
  } catch (err) {
    console.error('Blacklist cleanup error:', err.message);
  }
};

// Jalankan cleanup setiap 1 jam
setInterval(cleanupBlacklist, 60 * 60 * 1000);
// Jalankan sekali saat server start
cleanupBlacklist();

// Export isTokenBlacklisted agar bisa dipakai di authMiddleware.js
module.exports.isTokenBlacklisted = isTokenBlacklisted;


// ═══════════════════════════════════════════════════════════════════════════════
// 1. REGISTER
// POST /api/auth/register
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/register', registerLimiter, async (req, res) => {
  try {
    const raw = req.body || {};

    const name       = sanitize(raw.name       || '');
    const email      = sanitize(raw.email      || '').toLowerCase();
    const phone      = sanitize(raw.phone      || '');
    const password   = typeof raw.password === 'string' ? raw.password : '';
    const referredBy = raw.referred_by ? sanitize(raw.referred_by).toUpperCase() : null;

    if (!name || !email || !password || !phone) {
      return res.status(400).json({ success: false, error: 'Semua field wajib diisi.' });
    }
    if (name.length < 2) {
      return res.status(400).json({ success: false, error: 'Nama minimal 2 karakter.' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, error: 'Format email tidak valid.' });
    }
    if (!isValidPhone(phone)) {
      return res.status(400).json({ success: false, error: 'Format nomor HP tidak valid.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password minimal 6 karakter.' });
    }
    if (password.length > 128) {
      return res.status(400).json({ success: false, error: 'Password terlalu panjang.' });
    }

    const existingUser = await dbGet(`SELECT id FROM users WHERE email = ?`, [email]);
    if (existingUser) {
      await new Promise((r) => setTimeout(r, 300 + Math.random() * 200));
      return res.status(409).json({ success: false, error: 'Email sudah terdaftar.' });
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const userId         = crypto.randomUUID();
    const joinDate       = new Date().toISOString();
    const referralCode   = generateReferralCode();

    await dbRun(
      `INSERT INTO users (id, name, email, phone, password, join_date, referral_code, referred_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, name, email, phone, hashedPassword, joinDate, referralCode, referredBy]
    );

    let referralBonus = 0;
    if (referredBy) {
      try {
        const referrer = await dbGet(
          `SELECT id, name FROM users WHERE referral_code = ? AND id != ?`,
          [referredBy, userId]
        );
        if (referrer) {
          const milesReferee  = REFERRAL_CONFIG.REFEREE_MILES_ON_REGISTER;
          const milesReferrer = REFERRAL_CONFIG.REFERRER_MILES_PER_INVITE;

          await dbRun(`UPDATE users SET miles = miles + ? WHERE id = ?`, [milesReferee,  userId]);
          await dbRun(`UPDATE users SET miles = miles + ? WHERE id = ?`, [milesReferrer, referrer.id]);

          await dbRun(
            `INSERT OR IGNORE INTO referral_logs
             (referrer_id, referee_id, status, miles_referee, miles_referrer, registered_at)
             VALUES (?, ?, ?, ?, ?, datetime('now'))`,
            [referrer.id, userId, REFERRAL_CONFIG.STATUS.REGISTERED, milesReferee, milesReferrer]
          );

          const tier = await processTierBonus(referrer.id);
          if (tier.tierLabel) {
            await dbRun(
              `UPDATE referral_logs SET tier_bonus_awarded = ?, tier_label = ?
               WHERE referrer_id = ? AND referee_id = ?`,
              [tier.bonusAwarded, tier.tierLabel, referrer.id, userId]
            );
          }

          referralBonus = milesReferee;
          console.log(`✅ Referral registered: referrer=${referrer.name} +${milesReferrer}mi, referee=${name} +${milesReferee}mi`);
        }
      } catch (refErr) {
        console.error('⚠️  Referral error (tidak gagalkan register):', refErr.message);
      }
    }

    return res.status(201).json({
      success:        true,
      message:        'Registrasi berhasil. Silakan login.',
      referral_bonus: referralBonus,
    });

  } catch (error) {
    console.error('POST /register error:', error.message);
    return res.status(500).json({ success: false, error: 'Gagal melakukan registrasi.' });
  }
});


// ═══════════════════════════════════════════════════════════════════════════════
// 2. LOGIN
// POST /api/auth/login
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/login', loginLimiter, async (req, res) => {
  const ip        = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  const userAgent = req.headers['user-agent'] || '';

  try {
    const raw      = req.body || {};
    const email    = sanitize(raw.email    || '').toLowerCase();
    const password = typeof raw.password === 'string' ? raw.password : '';

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email dan password wajib diisi.' });
    }
    if (!isValidEmail(email)) {
      await logLoginAttempt(null, ip, userAgent, false, 'invalid_email_format');
      return res.status(401).json({ success: false, error: 'Email atau password salah.' });
    }

    const user = await dbGet(
      `SELECT id, name, email, password, role, permissions, miles, kyc_status,
              profile_picture, profile_banner, referral_code, phone, join_date,
              login_attempts, locked_until, last_login
       FROM users WHERE email = ?`,
      [email]
    );

    if (!user) {
      await new Promise((r) => setTimeout(r, 400 + Math.random() * 300));
      await logLoginAttempt(null, ip, userAgent, false, 'user_not_found');
      return res.status(401).json({ success: false, error: 'Email atau password salah.' });
    }

    if (user.locked_until && Date.now() < user.locked_until) {
      const remainSecs = Math.ceil((user.locked_until - Date.now()) / 1000);
      await logLoginAttempt(user.id, ip, userAgent, false, 'account_locked');
      return res.status(423).json({
        success: false,
        error:   `Akun dikunci sementara karena terlalu banyak percobaan gagal. Coba lagi dalam ${remainSecs} detik.`,
        locked_until: user.locked_until,
      });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      await incrementLoginFails(user.id);
      const updatedUser = await dbGet(`SELECT login_attempts, locked_until FROM users WHERE id = ?`, [user.id]);
      const remaining   = Math.max(0, MAX_LOGIN_FAILS - (updatedUser?.login_attempts || 0));
      await logLoginAttempt(user.id, ip, userAgent, false, 'wrong_password');

      if (updatedUser?.locked_until && Date.now() < updatedUser.locked_until) {
        return res.status(423).json({
          success: false,
          error:   `Terlalu banyak percobaan gagal. Akun dikunci 15 menit.`,
        });
      }

      return res.status(401).json({
        success: false,
        error:   remaining > 0
          ? `Email atau password salah. (${remaining} percobaan tersisa sebelum akun dikunci)`
          : 'Email atau password salah.',
      });
    }

    await resetLoginFails(user.id);
    await logLoginAttempt(user.id, ip, userAgent, true, null);

    // Hitung kapan token expired (untuk disimpan ke blacklist saat logout)
    const expiresAt = Date.now() + (8 * 60 * 60 * 1000); // 8 jam

    const token = jwt.sign(
      {
        id:          user.id,
        role:        user.role,
        permissions: user.permissions,
        exp:         Math.floor(expiresAt / 1000), // exp dalam detik (standard JWT)
      },
      JWT_SECRET
    );

    const {
      password:       _pwd,
      login_attempts: _la,
      locked_until:   _lu,
      ...safeUser
    } = user;

    return res.json({ success: true, user: safeUser, token });

  } catch (error) {
    console.error('POST /login error:', error.message);
    await logLoginAttempt(null, ip, userAgent, false, 'server_error').catch(() => {});
    return res.status(500).json({ success: false, error: 'Gagal melakukan login.' });
  }
});


// ═══════════════════════════════════════════════════════════════════════════════
// [FIX 1] 3. LOGOUT — Revoke JWT dengan blacklist
// POST /api/auth/logout
// Header: Authorization: Bearer <token>
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/logout', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'] || '';
    const token      = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      // Tidak ada token = sudah "logout", tetap balas sukses
      return res.json({ success: true, message: 'Logout berhasil.' });
    }

    // Decode token untuk ambil user_id dan exp tanpa verifikasi penuh
    // (token mungkin sudah expired tapi masih perlu di-blacklist)
    let decoded = null;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        // Token expired — tidak perlu di-blacklist, sudah tidak valid
        return res.json({ success: true, message: 'Logout berhasil.' });
      }
      // Token invalid — tetap logout
      return res.json({ success: true, message: 'Logout berhasil.' });
    }

    // Simpan token ke blacklist sampai waktu expired-nya
    const expiresAt = (decoded.exp || 0) * 1000; // konversi detik → ms
    await blacklistToken(token, decoded.id, expiresAt);

    return res.json({ success: true, message: 'Logout berhasil.' });

  } catch (error) {
    console.error('POST /logout error:', error.message);
    // Tetap balas sukses — logout tidak boleh gagal dari sisi UX
    return res.json({ success: true, message: 'Logout berhasil.' });
  }
});


// ═══════════════════════════════════════════════════════════════════════════════
// 4. FORGOT PASSWORD
// POST /api/auth/forgot-password
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/forgot-password', forgotLimiter, async (req, res) => {
  try {
    const raw   = req.body || {};
    const email = sanitize(raw.email || '').toLowerCase();

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ success: false, error: 'Email yang valid wajib diisi.' });
    }

    const user = await dbGet(`SELECT id FROM users WHERE email = ?`, [email]);

    if (!user) {
      await new Promise((r) => setTimeout(r, 500 + Math.random() * 300));
      return res.json({ success: true, message: 'Jika email terdaftar, tautan reset akan dikirim.' });
    }

    const resetToken      = crypto.randomBytes(32).toString('hex');
    const resetTokenHash  = crypto.createHash('sha256').update(resetToken).digest('hex');
    // [FIX P1] Simpan sebagai Unix detik — aman untuk SQLite INTEGER
    const resetTokenExpiry = Math.floor(Date.now() / 1000) + RESET_TOKEN_TTL_SEC;

    await dbRun(
      `UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?`,
      [resetTokenHash, resetTokenExpiry, user.id]
    );

    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

    // TODO: Ganti dengan Nodemailer / layanan email sesungguhnya
    console.log(`\n=== RESET PASSWORD ===\nEmail: ${email}\nLink : ${resetLink}\n=====================\n`);

    return res.json({ success: true, message: 'Jika email terdaftar, tautan reset akan dikirim.' });

  } catch (error) {
    console.error('POST /forgot-password error:', error.message);
    return res.status(500).json({ success: false, error: 'Gagal memproses permintaan.' });
  }
});


// ═══════════════════════════════════════════════════════════════════════════════
// 5. RESET PASSWORD
// POST /api/auth/reset-password
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/reset-password', async (req, res) => {
  try {
    const raw         = req.body || {};
    const token       = typeof raw.token        === 'string' ? raw.token.trim()  : '';
    const newPassword = typeof raw.new_password === 'string' ? raw.new_password  : '';

    if (!token || !newPassword) {
      return res.status(400).json({ success: false, error: 'Token dan password baru wajib diisi.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'Password baru minimal 6 karakter.' });
    }
    if (newPassword.length > 128) {
      return res.status(400).json({ success: false, error: 'Password terlalu panjang.' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // [FIX P1] Bandingkan dalam Unix detik — konsisten dengan cara simpan
    const user = await dbGet(
      `SELECT id FROM users WHERE reset_token = ? AND reset_token_expiry > ?`,
      [tokenHash, Math.floor(Date.now() / 1000)]
    );

    if (!user) {
      return res.status(400).json({ success: false, error: 'Token tidak valid atau sudah kedaluwarsa.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await dbRun(
      `UPDATE users
       SET password = ?, reset_token = NULL, reset_token_expiry = NULL,
           login_attempts = 0, locked_until = NULL
       WHERE id = ?`,
      [hashedPassword, user.id]
    );

    return res.json({ success: true, message: 'Password berhasil direset. Silakan login dengan password baru.' });

  } catch (error) {
    console.error('POST /reset-password error:', error.message);
    return res.status(500).json({ success: false, error: 'Gagal mereset password.' });
  }
});


// ═══════════════════════════════════════════════════════════════════════════════
// 6. VALIDASI KODE REFERRAL
// GET /api/auth/referral/validate?code=BR-XXXXXXXX
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/referral/validate', async (req, res) => {
  try {
    const code = sanitize(req.query.code || '').toUpperCase();

    if (!code || code.length < 4) {
      return res.status(400).json({ success: false, error: 'Kode referral tidak valid.' });
    }

    const referrer = await dbGet(
      `SELECT name FROM users WHERE referral_code = ?`,
      [code]
    );

    if (!referrer) {
      return res.status(404).json({ success: false, valid: false, error: 'Kode referral tidak ditemukan.' });
    }

    return res.json({
      success:                 true,
      valid:                   true,
      referrer_name:           referrer.name,
      reward_on_register:      REFERRAL_CONFIG.REFEREE_MILES_ON_REGISTER,
      reward_on_first_booking: REFERRAL_CONFIG.REFEREE_MILES_ON_FIRST_BOOKING,
      message:                 `Kode valid! Dapat +${REFERRAL_CONFIG.REFEREE_MILES_ON_REGISTER} miles saat daftar dan +${REFERRAL_CONFIG.REFEREE_MILES_ON_FIRST_BOOKING} miles setelah booking pertama.`,
    });

  } catch (error) {
    console.error('GET /referral/validate error:', error.message);
    return res.status(500).json({ success: false, error: 'Gagal memvalidasi kode referral.' });
  }
});


module.exports = router;
module.exports.isTokenBlacklisted = isTokenBlacklisted;
