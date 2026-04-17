const jwt = require('jsonwebtoken');
require('dotenv').config();

// ==========================================
// JWT SECRET — Wajib di-set via .env, tanpa fallback
// ==========================================
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('❌ FATAL: JWT_SECRET belum di-set di file .env!');
  console.error('   Tambahkan baris berikut di file .env:');
  console.error('   JWT_SECRET=your_super_secret_key_here');
  process.exit(1);
}

// ==========================================
// HELPER: Ekstrak dan verifikasi token dari header
// ==========================================
const extractToken = (req) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return null;

  // Format: "Bearer <token>"
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;

  return parts[1];
};

// ==========================================
// MIDDLEWARE: Verifikasi User (semua role)
// ==========================================
const verifyUser = (req, res, next) => {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({ success: false, error: 'Akses ditolak. Token tidak ditemukan.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
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
// MIDDLEWARE: Verifikasi Admin (admin, superadmin, subadmin)
// ==========================================
const ADMIN_ROLES = ['admin', 'superadmin', 'subadmin'];

const verifyAdmin = (req, res, next) => {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({ success: false, error: 'Akses ditolak. Token tidak ditemukan.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (!ADMIN_ROLES.includes(decoded.role)) {
      return res.status(403).json({ success: false, error: 'Akses ditolak. Anda bukan Admin.' });
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
// MIDDLEWARE: Cek Izin Spesifik (Role-Based Access Control)
// ==========================================
const requirePermission = (menuKey) => {
  return (req, res, next) => {
    // Superadmin & Admin utama bebas akses semua
    if (req.user.role === 'superadmin' || req.user.role === 'admin') {
      return next();
    }

    // Sub-Admin: parse permissions dari JWT
    let userPermissions = [];
    try {
      userPermissions = typeof req.user.permissions === 'string'
        ? JSON.parse(req.user.permissions)
        : (req.user.permissions || []);
    } catch (e) {
      userPermissions = [];
    }

    if (Array.isArray(userPermissions) && userPermissions.includes(menuKey)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: `Akses ditolak. Anda tidak memiliki izin untuk fitur "${menuKey}".`
    });
  };
};

module.exports = { verifyUser, verifyAdmin, requirePermission };
