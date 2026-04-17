/**
 * server.js — Brother Trans Backend
 * ====================================
 * Security improvements vs versi sebelumnya:
 *  - Helmet.js untuk security headers (XSS, clickjacking, MIME sniff, dll)
 *  - trust proxy agar rate limiter baca IP asli dari X-Forwarded-For
 *  - Body size limit 10mb (sudah ada) + explicit JSON type check
 *  - Request logging minimal (IP + method + path + status + ms)
 *  - Sembunyikan header X-Powered-By (Express)
 *
 * Dependensi:
 *   npm install helmet express-rate-limit
 */

'use strict';

const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const fs       = require('fs');
require('dotenv').config();

// ─── Helmet (security headers) ────────────────────────────────────────────────
let helmet;
try {
  helmet = require('helmet');
} catch {
  console.warn('⚠️  helmet belum terinstall. Jalankan: npm install helmet');
  helmet = null;
}

const db   = require('./db');
const app  = express();
const PORT = process.env.PORT || 5001;

// ═══════════════════════════════════════════════════════════════════════════════
// 1. TRUST PROXY
// Wajib jika di-deploy di belakang reverse proxy (Nginx, Caddy, Railway, dsb)
// agar express-rate-limit bisa baca IP asli dari X-Forwarded-For
// ═══════════════════════════════════════════════════════════════════════════════
app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : false);

// ═══════════════════════════════════════════════════════════════════════════════
// 2. SECURITY HEADERS (Helmet)
// ═══════════════════════════════════════════════════════════════════════════════
if (helmet) {
  app.use(
    helmet({
      // Content Security Policy — sesuaikan jika ada CDN/resource eksternal
      contentSecurityPolicy: {
        directives: {
          defaultSrc:  ["'self'"],
          scriptSrc:   ["'self'"],
          styleSrc:    ["'self'", "'unsafe-inline'"], // inline style masih umum di React
          imgSrc:      ["'self'", 'data:', 'https:'],
          connectSrc:  ["'self'"],
          fontSrc:     ["'self'", 'https:'],
          objectSrc:   ["'none'"],
          upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
        },
      },
      // Cegah browser menebak MIME type
      noSniff: true,
      // Cegah clickjacking
      frameguard: { action: 'deny' },
      // HSTS — aktifkan di production saja
      hsts: process.env.NODE_ENV === 'production'
        ? { maxAge: 31536000, includeSubDomains: true, preload: true }
        : false,
      // Sembunyikan X-Powered-By: Express
      hidePoweredBy: true,
      // XSS filter header
      xssFilter: true,
      // Referrer policy
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    })
  );
}

// Selalu hapus X-Powered-By meskipun Helmet tidak terinstall
app.disable('x-powered-by');

// ═══════════════════════════════════════════════════════════════════════════════
// 3. CORS
// ═══════════════════════════════════════════════════════════════════════════════
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Izinkan request tanpa origin (Postman, mobile app, curl)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`Origin "${origin}" tidak diizinkan oleh CORS.`));
    },
    credentials:      true,
    methods:          ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders:   ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders:   ['X-RateLimit-Limit', 'X-RateLimit-Remaining'],
    maxAge:           86400, // preflight cache 24 jam
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
// 4. BODY PARSER
// ═══════════════════════════════════════════════════════════════════════════════
app.use(express.json({ limit: '10mb', strict: true }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ═══════════════════════════════════════════════════════════════════════════════
// 5. REQUEST LOGGER (minimal, hanya di non-production atau jika LOG_REQUESTS=true)
// ═══════════════════════════════════════════════════════════════════════════════
if (process.env.NODE_ENV !== 'production' || process.env.LOG_REQUESTS === 'true') {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const ms     = Date.now() - start;
      const ip     = req.ip || req.headers['x-forwarded-for'] || '-';
      const status = res.statusCode;
      const color  = status >= 500 ? '\x1b[31m' : status >= 400 ? '\x1b[33m' : '\x1b[32m';
      console.log(`${color}${status}\x1b[0m ${req.method} ${req.originalUrl} — ${ms}ms — ${ip}`);
    });
    next();
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. STATIC FILES (uploads)
// ═══════════════════════════════════════════════════════════════════════════════
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Serving upload files dengan header cache yang tepat
app.use('/uploads', (req, res, next) => {
  res.setHeader('Cache-Control', 'public, max-age=86400');
  next();
}, express.static(uploadDir));

// ═══════════════════════════════════════════════════════════════════════════════
// 7. ROUTES
// ═══════════════════════════════════════════════════════════════════════════════
const authRoutes        = require('./routes/authRoutes');
const publicRoutes      = require('./routes/publicRoutes');
const userRoutes        = require('./routes/userRoutes');
const adminRoutes       = require('./routes/adminRoutes');
const financeRoutes     = require('./routes/financeRoutes');
const referralRoutes    = require('./routes/referralRoutes');
const lokerAdminRoutes  = require('./routes/lokerAdminRoutes');
const lokerPublicRoutes = require('./routes/lokerPublicRoutes');

// Urutan penting: spesifik dulu, wildcard belakang
app.use('/api/admin/loker',   lokerAdminRoutes);
app.use('/api/loker',         lokerPublicRoutes);
app.use('/api/auth',          authRoutes);
app.use('/api',               publicRoutes);
app.use('/api',               userRoutes);
app.use('/api',               referralRoutes);      // /api/referral/* (user)
app.use('/api/admin',         adminRoutes);
app.use('/api/admin/finance', financeRoutes);

// ═══════════════════════════════════════════════════════════════════════════════
// 8. HEALTH CHECK
// ═══════════════════════════════════════════════════════════════════════════════
app.get('/api/health', (req, res) => {
  res.json({
    success:   true,
    status:    'ok',
    timestamp: new Date().toISOString(),
    uptime:    Math.round(process.uptime()),
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 9. 404 HANDLER
// ═══════════════════════════════════════════════════════════════════════════════
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error:   `Endpoint ${req.method} ${req.originalUrl} tidak ditemukan.`,
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 10. GLOBAL ERROR HANDLER
// ═══════════════════════════════════════════════════════════════════════════════
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // Jangan log stack trace ke stdout di production kecuali DEBUG=true
  if (process.env.NODE_ENV !== 'production' || process.env.DEBUG === 'true') {
    console.error('❌ Unhandled Error:', err.stack || err.message);
  } else {
    console.error('❌ Unhandled Error:', err.message);
  }

  if (err.message?.includes('CORS')) {
    return res.status(403).json({ success: false, error: 'Akses tidak diizinkan.' });
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ success: false, error: 'Ukuran file terlalu besar. Maksimal 5MB.' });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, error: 'Body request tidak valid (bukan JSON).' });
  }

  const statusCode = err.status || err.statusCode || 500;
  return res.status(statusCode).json({
    success: false,
    // Di production: sembunyikan detail error internal
    error: process.env.NODE_ENV === 'production'
      ? 'Terjadi kesalahan pada server.'
      : err.message,
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 11. START SERVER + GRACEFUL SHUTDOWN
// ═══════════════════════════════════════════════════════════════════════════════
const server = app.listen(PORT, () => {
  console.log(`🚀 Brother Trans API  →  http://localhost:${PORT}`);
  console.log(`   Environment        →  ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Trust Proxy        →  ${process.env.TRUST_PROXY === 'true' ? 'yes' : 'no'}`);
});

const shutdown = (signal) => {
  console.log(`\n⚠️  ${signal} diterima. Menutup server...`);
  server.close(() => {
    db.close((err) => {
      if (err) console.error('❌ Gagal menutup database:', err.message);
      else     console.log('✅ Koneksi database ditutup.');
      process.exit(0);
    });
  });
  // Paksa shutdown setelah 10 detik jika ada koneksi yang menggantung
  setTimeout(() => {
    console.error('⚠️  Timeout — paksa shutdown.');
    process.exit(1);
  }, 10_000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

// Tangkap unhandled promise rejection agar server tidak crash diam-diam
process.on('unhandledRejection', (reason) => {
  console.error('⚠️  Unhandled Promise Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err.message);
  process.exit(1);
});
