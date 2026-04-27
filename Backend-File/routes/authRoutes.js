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
const path     = require('path');
const { OAuth2Client } = require('google-auth-library');
const db       = require('../db');
const REFERRAL_CONFIG = require('../utils/referralConfig');
const { sendResetPasswordEmail, sendEmailOtp, isEnabled: isMailerEnabled } = require('../utils/mailer'); // [FIX P7]
// Load env robustly regardless of PM2 cwd
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

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

// ─── Email OTP config ────────────────────────────────────────────────────────
const EMAIL_OTP_REQUIRED =
  String(process.env.EMAIL_OTP_REQUIRED || '').trim() === '1'
    ? true
    : !!isMailerEnabled();
const OTP_TTL_SEC = 10 * 60;
const OTP_RESEND_MIN_SEC = 60;
const OTP_MAX_SEND_PER_HOUR = 5;
const OTP_MAX_ATTEMPTS = 6;
const OTP_SECRET = process.env.EMAIL_OTP_SECRET || JWT_SECRET;

const nowSec = () => Math.floor(Date.now() / 1000);
const randomOtpCode = () => String(Math.floor(100000 + Math.random() * 900000));
const otpHash = ({ userId, email, code }) =>
  crypto
    .createHash('sha256')
    .update(`${OTP_SECRET}:${String(userId)}:${String(email).toLowerCase()}:${String(code)}`)
    .digest('hex');

// ─── Google Sign-In config ───────────────────────────────────────────────────
const GOOGLE_CLIENT_IDS = String(process.env.GOOGLE_CLIENT_ID || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const googleClient = GOOGLE_CLIENT_IDS.length ? new OAuth2Client() : null;

const isGoogleEnabled = () => GOOGLE_CLIENT_IDS.length > 0;

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

const emailOtpLimiter = rateLimit(baseRateOpts({
  windowMs: 10 * 60 * 1000,
  max:      10,
  message:  { success: false, error: 'Terlalu banyak permintaan OTP. Coba lagi beberapa menit.' },
}));

const googleLimiter = rateLimit(baseRateOpts({
  windowMs: 10 * 60 * 1000,
  max:      30,
  message:  { success: false, error: 'Terlalu banyak percobaan login Google. Coba lagi beberapa menit.' },
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

const upsertEmailOtp = async ({ userId, email }) => {
  const t = nowSec();
  const code = randomOtpCode();
  const hash = otpHash({ userId, email, code });
  const exp = t + OTP_TTL_SEC;

  const row = await dbGet(`SELECT * FROM email_otps WHERE user_id = ? LIMIT 1`, [userId]).catch(() => null);
  let sentHourStart = row?.sent_hour_start_sec ? Number(row.sent_hour_start_sec) : null;
  let sentCountHour = row?.sent_count_hour ? Number(row.sent_count_hour) : 0;
  const lastSent = row?.last_sent_at_sec ? Number(row.last_sent_at_sec) : 0;

  if (!sentHourStart || t - sentHourStart >= 3600) {
    sentHourStart = t;
    sentCountHour = 0;
  }
  if (lastSent && t - lastSent < OTP_RESEND_MIN_SEC) {
    const wait = OTP_RESEND_MIN_SEC - (t - lastSent);
    const e = new Error(`Tunggu ${wait} detik sebelum kirim ulang OTP.`);
    e.statusCode = 429;
    throw e;
  }
  if (sentCountHour >= OTP_MAX_SEND_PER_HOUR) {
    const e = new Error('Batas kirim OTP tercapai. Coba lagi nanti.');
    e.statusCode = 429;
    throw e;
  }

  if (row) {
    await dbRun(
      `UPDATE email_otps
       SET email = ?, code_hash = ?, expires_at_sec = ?, attempts = 0,
           sent_hour_start_sec = ?, sent_count_hour = ?, last_sent_at_sec = ?, verified_at_sec = NULL
       WHERE user_id = ?`,
      [email, hash, exp, sentHourStart, sentCountHour + 1, t, userId]
    );
  } else {
    await dbRun(
      `INSERT INTO email_otps
        (user_id, email, code_hash, expires_at_sec, attempts, sent_hour_start_sec, sent_count_hour, last_sent_at_sec)
       VALUES (?, ?, ?, ?, 0, ?, 1, ?)`,
      [userId, email, hash, exp, t, t]
    );
  }

  return { code, expires_at_sec: exp };
};

const verifyEmailOtp = async ({ userId, email, code }) => {
  const row = await dbGet(`SELECT * FROM email_otps WHERE user_id = ? LIMIT 1`, [userId]);
  const t = nowSec();
  if (!row) {
    const e = new Error('OTP tidak ditemukan. Silakan kirim ulang.');
    e.statusCode = 400;
    throw e;
  }
  if (row.verified_at_sec) return { ok: true, already: true };
  if (Number(row.expires_at_sec) <= t) {
    const e = new Error('OTP sudah kedaluwarsa. Silakan kirim ulang.');
    e.statusCode = 400;
    throw e;
  }
  const attempts = Number(row.attempts) || 0;
  if (attempts >= OTP_MAX_ATTEMPTS) {
    const e = new Error('Terlalu banyak percobaan OTP. Silakan kirim ulang.');
    e.statusCode = 429;
    throw e;
  }
  const hash = otpHash({ userId, email, code });
  if (hash !== row.code_hash) {
    await dbRun(`UPDATE email_otps SET attempts = attempts + 1 WHERE user_id = ?`, [userId]);
    const e = new Error('Kode OTP salah.');
    e.statusCode = 400;
    throw e;
  }
  await dbRun(`UPDATE email_otps SET verified_at_sec = ? WHERE user_id = ?`, [t, userId]);
  await dbRun(`UPDATE users SET email_verified = 1 WHERE id = ?`, [userId]);
  return { ok: true };
};

const verifyGoogleIdToken = async (idToken) => {
  if (!isGoogleEnabled() || !googleClient) {
    const e = new Error('Google login belum dikonfigurasi.');
    e.statusCode = 503;
    throw e;
  }
  if (!idToken || typeof idToken !== 'string') {
    const e = new Error('Token Google tidak valid.');
    e.statusCode = 400;
    throw e;
  }

  // Verify against the allowed audience(s)
  let ticket = null;
  for (const aud of GOOGLE_CLIENT_IDS) {
    try {
      ticket = await googleClient.verifyIdToken({ idToken, audience: aud });
      break;
    } catch {}
  }
  if (!ticket) {
    const e = new Error('Token Google tidak valid.');
    e.statusCode = 401;
    throw e;
  }
  const payload = ticket.getPayload() || {};
  if (!payload.sub || !payload.email) {
    const e = new Error('Data Google tidak lengkap.');
    e.statusCode = 400;
    throw e;
  }
  if (payload.email_verified === false) {
    const e = new Error('Email Google belum terverifikasi.');
    e.statusCode = 403;
    throw e;
  }
  return {
    sub: String(payload.sub),
    email: String(payload.email).toLowerCase(),
    name: payload.name ? String(payload.name).trim().slice(0, 140) : null,
    picture: payload.picture ? String(payload.picture).trim().slice(0, 400) : null,
  };
};

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
    if (EMAIL_OTP_REQUIRED && !isMailerEnabled()) {
      return res.status(503).json({
        success: false,
        error: 'Verifikasi email (OTP) belum aktif. Silakan hubungi admin.',
      });
    }

    const raw = req.body || {};

    const name       = sanitize(raw.name       || '');
    const email      = sanitize(raw.email      || '').toLowerCase();
    const phone      = sanitize(raw.phone      || '');
    const ktpIdRaw   = sanitize(raw.ktp_id || raw.nik || '');
    const ktp_id     = ktpIdRaw.replace(/\D/g, '');
    const password   = typeof raw.password === 'string' ? raw.password : '';
    const referredBy = raw.referred_by ? sanitize(raw.referred_by).toUpperCase() : null;

    if (!name || !email || !password || !phone || !ktp_id) {
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
    if (ktp_id.length !== 16) {
      return res.status(400).json({ success: false, error: 'ID KTP (NIK) harus 16 digit angka.' });
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

    const existingKtp = await dbGet(`SELECT id FROM users WHERE ktp_id = ? LIMIT 1`, [ktp_id]);
    if (existingKtp) {
      await new Promise((r) => setTimeout(r, 250 + Math.random() * 150));
      return res.status(409).json({ success: false, error: 'ID KTP sudah terdaftar.' });
    }

    const blacklisted = await dbGet(`SELECT id FROM ktp_blacklist WHERE ktp_id = ? LIMIT 1`, [ktp_id]);
    if (blacklisted) {
      await new Promise((r) => setTimeout(r, 250 + Math.random() * 150));
      return res.status(403).json({ success: false, error: 'Registrasi ditolak. Silakan hubungi admin.' });
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const userId         = crypto.randomUUID();
    const joinDate       = new Date().toISOString();
    const referralCode   = generateReferralCode();

    await dbRun(
      `INSERT INTO users (id, name, email, phone, ktp_id, password, join_date, referral_code, referred_by, email_verified)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, name, email, phone, ktp_id, hashedPassword, joinDate, referralCode, referredBy, 0]
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

    // Kirim OTP email (best-effort tetapi untuk login wajib)
    if (EMAIL_OTP_REQUIRED) {
      const otp = await upsertEmailOtp({ userId, email });
      const sent = await sendEmailOtp(email, otp.code);
      if (!sent?.success) {
        console.error('⚠️  Email OTP send failed:', sent?.reason || 'unknown');
        // Jangan biarkan user terjebak akun tidak bisa login tanpa OTP
        await dbRun(`DELETE FROM users WHERE id = ?`, [userId]).catch(() => {});
        await dbRun(`DELETE FROM email_otps WHERE user_id = ?`, [userId]).catch(() => {});
        return res.status(503).json({
          success: false,
          error: 'Gagal mengirim OTP email. Coba lagi beberapa menit.',
        });
      }
    } else {
      // Kalau OTP tidak diwajibkan, set verified agar tidak menghambat login.
      await dbRun(`UPDATE users SET email_verified = 1 WHERE id = ?`, [userId]).catch(() => {});
    }

    return res.status(201).json({
      success: true,
      message: EMAIL_OTP_REQUIRED
        ? 'Registrasi berhasil. Cek email untuk kode OTP.'
        : 'Registrasi berhasil. Silakan login.',
      referral_bonus: referralBonus,
      email_otp_required: EMAIL_OTP_REQUIRED,
    });

  } catch (error) {
    console.error('POST /register error:', error.message);
    return res.status(500).json({ success: false, error: 'Gagal melakukan registrasi.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 1b. EMAIL OTP (Verify before login)
// POST /api/auth/email-otp/request  — kirim / kirim ulang OTP
// POST /api/auth/email-otp/verify   — verifikasi OTP
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/email-otp/request', emailOtpLimiter, async (req, res) => {
  try {
    const raw = req.body || {};
    const email = sanitize(raw.email || '').toLowerCase();
    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, error: 'Format email tidak valid.' });
    }
    if (!EMAIL_OTP_REQUIRED) {
      return res.json({ success: true, message: 'OTP email tidak diwajibkan.' });
    }
    if (!isMailerEnabled()) {
      return res.status(503).json({ success: false, error: 'Verifikasi email (OTP) belum aktif. Silakan hubungi admin.' });
    }

    const user = await dbGet(`SELECT id, email_verified FROM users WHERE email = ? LIMIT 1`, [email]);
    if (!user) {
      // anti enumeration
      return res.json({ success: true, message: 'Jika email terdaftar, OTP akan dikirim.' });
    }
    const isVerified = Number(user.email_verified ?? 1) === 1;
    if (isVerified) {
      return res.json({ success: true, message: 'Email sudah terverifikasi.' });
    }

    const otp = await upsertEmailOtp({ userId: user.id, email });
    const sent = await sendEmailOtp(email, otp.code);
    if (!sent?.success) {
      return res.status(503).json({ success: false, error: 'Gagal mengirim OTP. Coba lagi beberapa menit.' });
    }

    res.json({ success: true, message: 'OTP sudah dikirim. Silakan cek inbox/spam.' });
  } catch (err) {
    const status = err?.statusCode || 500;
    if (status !== 500) return res.status(status).json({ success: false, error: err.message });
    console.error('POST /email-otp/request error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengirim OTP.' });
  }
});

router.post('/email-otp/verify', emailOtpLimiter, async (req, res) => {
  try {
    const raw = req.body || {};
    const email = sanitize(raw.email || '').toLowerCase();
    const code = String(raw.code || '').trim();
    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, error: 'Format email tidak valid.' });
    }
    if (!/^[0-9]{6}$/.test(code)) {
      return res.status(400).json({ success: false, error: 'Kode OTP harus 6 digit angka.' });
    }
    if (!EMAIL_OTP_REQUIRED) {
      return res.json({ success: true, message: 'OTP email tidak diwajibkan.' });
    }

    const user = await dbGet(`SELECT id, email_verified FROM users WHERE email = ? LIMIT 1`, [email]);
    if (!user) return res.status(400).json({ success: false, error: 'Kode OTP salah.' });

    const isVerified = Number(user.email_verified ?? 1) === 1;
    if (isVerified) {
      return res.json({ success: true, message: 'Email sudah terverifikasi. Silakan login.' });
    }

    await verifyEmailOtp({ userId: user.id, email, code });

    res.json({ success: true, message: 'Email berhasil diverifikasi. Silakan login.' });
  } catch (err) {
    const status = err?.statusCode || 500;
    if (status !== 500) return res.status(status).json({ success: false, error: err.message });
    console.error('POST /email-otp/verify error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal memverifikasi OTP.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 1c. GOOGLE LOGIN / REGISTER
// POST /api/auth/google
// POST /api/auth/google/complete
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/google', googleLimiter, async (req, res) => {
  try {
    const idToken = req.body?.id_token;
    const g = await verifyGoogleIdToken(idToken);

    // Existing user by google_sub
    let user = await dbGet(
      `SELECT id, vendor_name, name, email, phone, ktp_id, role, permissions, miles, kyc_status,
              profile_picture, profile_banner, referral_code, join_date, email_verified, google_sub
       FROM users WHERE google_sub = ? LIMIT 1`,
      [g.sub]
    );

    // Existing user by email (link account)
    if (!user) {
      user = await dbGet(
        `SELECT id, vendor_name, name, email, phone, ktp_id, role, permissions, miles, kyc_status,
                profile_picture, profile_banner, referral_code, join_date, email_verified, google_sub
         FROM users WHERE email = ? LIMIT 1`,
        [g.email]
      );
      if (user && !user.google_sub) {
        await dbRun(`UPDATE users SET google_sub = ?, email_verified = 1 WHERE id = ?`, [g.sub, user.id]).catch(() => {});
        if (g.picture && !user.profile_picture) {
          await dbRun(`UPDATE users SET profile_picture = ? WHERE id = ?`, [g.picture, user.id]).catch(() => {});
          user.profile_picture = g.picture;
        }
        user.google_sub = g.sub;
      }
    }

    // If user exists and already complete → issue JWT
    if (user) {
      // Staff/admin accounts don't require phone/NIK completion.
      // Completion flow is only for regular users to ensure booking data completeness.
      const isPrivileged = user.role && user.role !== 'user';
      if (!isPrivileged) {
        const hasPhone = !!String(user.phone || '').trim();
        const hasKtp = String(user.ktp_id || '').replace(/\D/g, '').length === 16;
        if (!hasPhone || !hasKtp) {
          const tempExpSec = Math.floor(Date.now() / 1000) + (15 * 60);
          const tempToken = jwt.sign(
            { scope: 'google_complete', sub: g.sub, email: g.email, name: g.name, picture: g.picture, exp: tempExpSec },
            JWT_SECRET
          );
          return res.json({
            success: true,
            needs_profile: true,
            temp_token: tempToken,
            profile: { email: g.email, name: g.name, picture: g.picture },
          });
        }
      }

      // Mark email as verified (trusted by Google)
      await dbRun(`UPDATE users SET email_verified = 1 WHERE id = ?`, [user.id]).catch(() => {});
      user.email_verified = 1;

      const expiresAt = Date.now() + (8 * 60 * 60 * 1000);
      const token = jwt.sign(
        { id: user.id, role: user.role, permissions: user.permissions, exp: Math.floor(expiresAt / 1000) },
        JWT_SECRET
      );

      return res.json({ success: true, user, token });
    }

    // New user: ask for additional profile (phone + NIK)
    const tempExpSec = Math.floor(Date.now() / 1000) + (15 * 60);
    const tempToken = jwt.sign(
      { scope: 'google_complete', sub: g.sub, email: g.email, name: g.name, picture: g.picture, exp: tempExpSec },
      JWT_SECRET
    );
    return res.json({
      success: true,
      needs_profile: true,
      temp_token: tempToken,
      profile: { email: g.email, name: g.name, picture: g.picture },
    });
  } catch (err) {
    const status = err?.statusCode || 500;
    if (status !== 500) return res.status(status).json({ success: false, error: err.message });
    console.error('POST /auth/google error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal login dengan Google.' });
  }
});

router.post('/google/complete', googleLimiter, async (req, res) => {
  try {
    const { temp_token, phone, ktp_id } = req.body || {};
    if (!temp_token || typeof temp_token !== 'string') {
      return res.status(400).json({ success: false, error: 'Token tidak valid.' });
    }
    let decoded = null;
    try {
      decoded = jwt.verify(temp_token, JWT_SECRET);
    } catch {
      return res.status(401).json({ success: false, error: 'Token sudah kedaluwarsa. Silakan ulangi login Google.' });
    }
    if (decoded?.scope !== 'google_complete' || !decoded?.email || !decoded?.sub) {
      return res.status(400).json({ success: false, error: 'Token tidak valid.' });
    }

    const email = String(decoded.email).toLowerCase();
    const name = decoded.name ? String(decoded.name).trim().slice(0, 140) : 'User';
    const picture = decoded.picture ? String(decoded.picture).trim().slice(0, 400) : null;
    const googleSub = String(decoded.sub);

    const safePhone = sanitize(phone || '');
    if (!isValidPhone(safePhone)) {
      return res.status(400).json({ success: false, error: 'Format nomor HP tidak valid.' });
    }
    const nik = String(ktp_id || '').replace(/\D/g, '');
    if (nik.length !== 16) {
      return res.status(400).json({ success: false, error: 'ID KTP (NIK) harus 16 digit angka.' });
    }

    // If email exists, update that account (link + fill missing)
    const existing = await dbGet(`SELECT id, role, google_sub FROM users WHERE email = ? LIMIT 1`, [email]);
    if (existing) {
      if (existing.role !== 'user') {
        return res.status(403).json({ success: false, error: 'Akun ini tidak bisa digunakan untuk login Google.' });
      }
      await dbRun(
        `UPDATE users
         SET phone = COALESCE(NULLIF(phone, ''), ?),
             ktp_id = COALESCE(NULLIF(ktp_id, ''), ?),
             google_sub = COALESCE(google_sub, ?),
             email_verified = 1,
             profile_picture = COALESCE(profile_picture, ?)
         WHERE id = ?`,
        [safePhone, nik, googleSub, picture, existing.id]
      );

      const user = await dbGet(
        `SELECT id, name, email, phone, ktp_id, role, permissions, miles, kyc_status,
                profile_picture, profile_banner, referral_code, join_date, email_verified, google_sub
         FROM users WHERE id = ? LIMIT 1`,
        [existing.id]
      );

      const expiresAt = Date.now() + (8 * 60 * 60 * 1000);
      const token = jwt.sign(
        { id: user.id, role: user.role, permissions: user.permissions, exp: Math.floor(expiresAt / 1000) },
        JWT_SECRET
      );
      return res.json({ success: true, user, token });
    }

    // Ensure NIK not duplicated
    const existingKtp = await dbGet(`SELECT id FROM users WHERE ktp_id = ? LIMIT 1`, [nik]);
    if (existingKtp) {
      return res.status(409).json({ success: false, error: 'ID KTP sudah terdaftar.' });
    }

    // Create new user (password random)
    const userId = crypto.randomUUID();
    const joinDate = new Date().toISOString();
    const referralCode = generateReferralCode();
    const randomPassword = crypto.randomBytes(32).toString('hex');
    const hashedPassword = await bcrypt.hash(randomPassword, BCRYPT_ROUNDS);

    await dbRun(
      `INSERT INTO users (id, name, email, phone, ktp_id, password, join_date, referral_code, email_verified, google_sub, profile_picture)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [userId, name, email, safePhone, nik, hashedPassword, joinDate, referralCode, googleSub, picture]
    );

    const user = await dbGet(
      `SELECT id, name, email, phone, ktp_id, role, permissions, miles, kyc_status,
              profile_picture, profile_banner, referral_code, join_date, email_verified, google_sub
       FROM users WHERE id = ? LIMIT 1`,
      [userId]
    );

    const expiresAt = Date.now() + (8 * 60 * 60 * 1000);
    const token = jwt.sign(
      { id: user.id, role: user.role, permissions: user.permissions, exp: Math.floor(expiresAt / 1000) },
      JWT_SECRET
    );
    return res.json({ success: true, user, token });
  } catch (err) {
    const status = err?.statusCode || 500;
    if (status !== 500) return res.status(status).json({ success: false, error: err.message });
    console.error('POST /auth/google/complete error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal menyimpan data akun.' });
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
      `SELECT id, vendor_name, name, email, password, role, permissions, miles, kyc_status,
              profile_picture, profile_banner, referral_code, phone, join_date,
              login_attempts, locked_until, last_login, email_verified
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

    // Enforce email OTP before login (only for users with email_verified=0)
    const isVerified = Number(user.email_verified ?? 1) === 1;
    if (EMAIL_OTP_REQUIRED && user.role === 'user' && !isVerified) {
      return res.status(403).json({
        success: false,
        error: 'Email belum diverifikasi. Masukkan kode OTP yang dikirim ke email kamu.',
        needs_email_verification: true,
        email,
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

    // [FIX P7] Kirim email sungguhan via Nodemailer (Gmail)
    // Fire-and-forget — jika email gagal, tetap balas sukses ke user
    // (tidak bocorkan info apakah email terdaftar atau tidak)
    sendResetPasswordEmail(email, resetLink)
      .then((result) => {
        if (!result.success) {
          // Fallback: log ke console jika email gagal terkirim
          console.warn(`⚠️  Reset password email gagal ke ${email}:`, result.reason);
          console.warn(`   Fallback link: ${resetLink}`);
        }
      })
      .catch(() => {
        console.warn(`⚠️  Reset password email error. Fallback link: ${resetLink}`);
      });

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
