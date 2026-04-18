'use strict';

const jwt    = require('jsonwebtoken');
const crypto = require('crypto');
const db     = require('../db');
require('dotenv').config();

// ==========================================
// JWT SECRET
// ==========================================
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('❌ FATAL: JWT_SECRET belum di-set di file .env!');
  process.exit(1);
}

// ==========================================
// DB Helper (promisify)
// ==========================================
const dbGet = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)))
  );

// ==========================================
// HELPER: Ekstrak token dari header
// ==========================================
const extractToken = (req) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  return parts[1];
};

// ==========================================
// [FIX 1] HELPER: Cek token blacklist
// Token di-hash SHA-256 sebelum dibandingkan dengan DB
// ==========================================
const isTokenBlacklisted = async (token) => {
  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const row = await dbGet(
      `SELECT id FROM token_blacklist WHERE token_hash = ? AND expires_at > ?`,
      [tokenHash, Date.now()]
    );
    return !!row;
  } catch {
    // Jika tabel belum ada atau query error, jangan blokir request
    return false;
  }
};

// ==========================================
// MIDDLEWARE: Verifikasi User (semua role)
// ==========================================
const verifyUser = async (req, res, next) => {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({ success: false, error: 'Akses ditolak. Token tidak ditemukan.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // [FIX 1] Tolak token yang sudah di-logout (ada di blacklist)
    const revoked = await isTokenBlacklisted(token);
    if (revoked) {
      return res.status(401).json({
        success: false,
        error: 'Sesi telah berakhir. Silakan login kembali.',
      });
    }

    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: 'Sesi Anda telah berakhir. Silakan login ulang.' });
    }
    return res.status(401).json({ success: false, error: 'Token tidak valid.' });
  }
};

// ==========================================
// MIDDLEWARE: Verifikasi Admin
// ==========================================
const ADMIN_ROLES = ['admin', 'superadmin', 'subadmin'];

const verifyAdmin = async (req, res, next) => {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({ success: false, error: 'Akses ditolak. Token tidak ditemukan.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (!ADMIN_ROLES.includes(decoded.role)) {
      return res.status(403).json({ success: false, error: 'Akses ditolak. Anda bukan Admin.' });
    }

    // [FIX 1] Tolak token yang sudah di-logout (ada di blacklist)
    const revoked = await isTokenBlacklisted(token);
    if (revoked) {
      return res.status(401).json({
        success: false,
        error: 'Sesi telah berakhir. Silakan login kembali.',
      });
    }

    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: 'Sesi Anda telah berakhir. Silakan login ulang.' });
    }
    return res.status(401).json({ success: false, error: 'Token admin tidak valid.' });
  }
};

// ==========================================
// MIDDLEWARE: Cek Izin Spesifik (RBAC)
// ==========================================
const requirePermission = (menuKey) => {
  return (req, res, next) => {
    if (req.user.role === 'superadmin' || req.user.role === 'admin') {
      return next();
    }

    let userPermissions = [];
    try {
      userPermissions = typeof req.user.permissions === 'string'
        ? JSON.parse(req.user.permissions)
        : (req.user.permissions || []);
    } catch {
      userPermissions = [];
    }

    if (Array.isArray(userPermissions) && userPermissions.includes(menuKey)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: `Akses ditolak. Anda tidak memiliki izin untuk fitur "${menuKey}".`,
    });
  };
};

module.exports = { verifyUser, verifyAdmin, requirePermission };
