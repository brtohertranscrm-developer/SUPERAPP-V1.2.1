'use strict';

const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const fs       = require('fs');
// Load env robustly regardless of PM2 cwd
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

// ─── Helmet (opsional, graceful fallback jika belum install) ──────────────────
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
// 0. BACKGROUND JOBS — cleanup booking expired (pending/unpaid)
// ═══════════════════════════════════════════════════════════════════════════════
const dbRun = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.run(sql, params, function (err) {
      err ? reject(err) : resolve({ lastID: this.lastID, changes: this.changes });
    })
  );

const cleanupExpiredBookings = async () => {
  const ttlMinRaw = parseInt(process.env.BOOKING_PENDING_TTL_MINUTES || '180', 10);
  const ttlMin = Number.isFinite(ttlMinRaw)
    ? Math.max(5, Math.min(24 * 60, ttlMinRaw))
    : 180;

  // Safety net: if expires_at belum ada di booking lama, set berdasarkan created_at/start_date
  // (hanya untuk pending/unpaid)
  try {
    await dbRun(
      `
      UPDATE bookings
      SET expires_at = datetime(COALESCE(created_at, start_date), ?)
      WHERE status = 'pending'
        AND payment_status = 'unpaid'
        AND (expires_at IS NULL OR trim(expires_at) = '')
      `,
      [`+${ttlMin} minutes`]
    );
  } catch {}

  // Cancel booking yang sudah lewat expiry, tapi jangan cancel kalau sudah ada bukti transfer pending
  await dbRun(
    `
    UPDATE bookings
    SET status = 'cancelled'
    WHERE status = 'pending'
      AND payment_status = 'unpaid'
      AND expires_at IS NOT NULL
      AND datetime(expires_at) <= datetime('now')
      AND NOT EXISTS (
        SELECT 1
        FROM payment_reconciliations pr
        WHERE pr.order_id = bookings.order_id
          AND pr.status = 'pending'
      )
    `
  ).catch(() => {});
};

setInterval(() => {
  cleanupExpiredBookings().catch(() => {});
}, 5 * 60 * 1000);

// ═══════════════════════════════════════════════════════════════════════════════
// 1. TRUST PROXY
// ═══════════════════════════════════════════════════════════════════════════════
app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : false);

// ═══════════════════════════════════════════════════════════════════════════════
// 2. SECURITY HEADERS (Helmet)
// ═══════════════════════════════════════════════════════════════════════════════
if (helmet) {
  app.use(
    helmet({
      // Needed for Google Sign-In popup/iframe postMessage
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
      contentSecurityPolicy: {
        directives: {
          defaultSrc:  ["'self'"],
          scriptSrc:   ["'self'"],
          styleSrc:    ["'self'", "'unsafe-inline'"],
          imgSrc:      ["'self'", 'data:', 'https:', 'http://localhost:5001'],
          connectSrc:  ["'self'", 'http://localhost:5001'],
          fontSrc:     ["'self'", 'https:'],
          objectSrc:   ["'none'"],
          upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
        },
      },
      noSniff:    true,
      frameguard: { action: 'deny' },
      hsts:       process.env.NODE_ENV === 'production'
                    ? { maxAge: 31536000, includeSubDomains: true, preload: true }
                    : false,
      hidePoweredBy:  true,
      xssFilter:      true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      // FIX: default Helmet set CORP ke same-origin, blokir gambar dari port beda
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      // FIX: matikan COEP agar gambar /uploads bisa tampil di frontend dev
      crossOriginEmbedderPolicy: false,
    })
  );
}

app.disable('x-powered-by');

// ═══════════════════════════════════════════════════════════════════════════════
// 3. HTTPS ENFORCEMENT (Peringatan 6)
// Redirect HTTP → HTTPS di production, KECUALI di localhost/127.0.0.1
// ═══════════════════════════════════════════════════════════════════════════════
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    const host = req.headers.host || '';

    // Jangan redirect jika akses dari localhost (development di mesin production)
    const isLocalhost = host.startsWith('localhost') || host.startsWith('127.0.0.1');
    if (isLocalhost) return next();

    // x-forwarded-proto diset oleh Nginx / reverse proxy
    const proto = req.headers['x-forwarded-proto'] || req.protocol;
    if (proto !== 'https') {
      return res.redirect(301, `https://${host}${req.originalUrl}`);
    }
    next();
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. CORS (Peringatan 2)
// Request tanpa origin (Postman, mobile app native, curl) diizinkan tapi
// di production dicatat ke log agar bisa dimonitor jika ada penyalahgunaan.
// ═══════════════════════════════════════════════════════════════════════════════
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://brotherstrans.id',
  'https://beta.brotherstrans.id',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Request tanpa origin: mobile app, Postman, curl — izinkan
      // Di production, log sebagai peringatan untuk monitoring
      if (!origin) {
        if (process.env.NODE_ENV === 'production' && process.env.LOG_NO_ORIGIN === 'true') {
          console.warn(`⚠️  CORS: request tanpa origin diterima — ${new Date().toISOString()}`);
        }
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`Origin "${origin}" tidak diizinkan oleh CORS.`));
    },
    credentials:    true,
    methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining'],
    maxAge:         86400,
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
// 4. BODY PARSER
// ═══════════════════════════════════════════════════════════════════════════════
app.use(express.json({ limit: '10mb', strict: true }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ═══════════════════════════════════════════════════════════════════════════════
// 5. REQUEST LOGGER
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

app.use('/uploads', (req, res, next) => {
  res.setHeader('Cache-Control', 'public, max-age=86400');
  next();
}, express.static(uploadDir));

// ═══════════════════════════════════════════════════════════════════════════════
// 7. ROUTES
// ═══════════════════════════════════════════════════════════════════════════════
// 8. HEALTH CHECK (PUBLIC)
// Harus didefinisikan SEBELUM mount routes '/api' yang mungkin memakai verifyUser.
app.get('/api/health', (req, res) => {
  res.json({
    success:   true,
    status:    'ok',
    timestamp: new Date().toISOString(),
    uptime:    Math.round(process.uptime()),
  });
});

const authRoutes        = require('./routes/authRoutes');
const publicRoutes      = require('./routes/publicRoutes');
const userRoutes        = require('./routes/userRoutes');
const adminRoutes       = require('./routes/adminRoutes');
const financeRoutes     = require('./routes/financeRoutes');
const referralRoutes    = require('./routes/referralRoutes');
const lokerAdminRoutes  = require('./routes/lokerAdminRoutes');
const lokerPublicRoutes = require('./routes/lokerPublicRoutes');
const adminReferralRoutes = require('./routes/adminReferralRoutes');
const logisticsRoutes   = require('./routes/logisticsRoutes');
const manningRoutes     = require('./routes/manningRoutes');
const customOrderRoutes = require('./routes/customOrderRoutes');
const seoPublicRoutes   = require('./routes/seoPublicRoutes');
const seoAdminRoutes    = require('./routes/seoAdminRoutes');
const ticketPublicRoutes = require('./routes/ticketPublicRoutes');
const ticketUserRoutes = require('./routes/ticketUserRoutes');
const ticketVendorRoutes = require('./routes/ticketVendorRoutes');
const ticketAdminRoutes = require('./routes/ticketAdminRoutes');
const placesPublicRoutes = require('./routes/placesPublicRoutes');
const placesAdminRoutes = require('./routes/placesAdminRoutes');

// Urutan penting: spesifik dulu, wildcard belakang
app.use('/api/admin/loker',   lokerAdminRoutes);
app.use('/api/admin/logistics', logisticsRoutes);
app.use('/api/admin/manning', manningRoutes);
app.use('/api/admin/seo-pages', seoAdminRoutes);
app.use('/api/admin/tickets', ticketAdminRoutes);
app.use('/api/admin/places', placesAdminRoutes);
app.use('/api/loker',         lokerPublicRoutes);
app.use('/api/auth',          authRoutes);
app.use('/api/places',        placesPublicRoutes);
app.use('/api/tickets',       ticketPublicRoutes);
app.use('/api/vendor/tickets', ticketVendorRoutes);
app.use('/api',               seoPublicRoutes);
app.use('/api',               publicRoutes);
app.use('/api',               userRoutes);
app.use('/api',               ticketUserRoutes);
app.use('/api',               referralRoutes);
app.use('/api/admin',         adminRoutes);
app.use('/api/admin/finance', financeRoutes);
app.use('/api/admin/referral', adminReferralRoutes);
app.use('/api/custom-orders', customOrderRoutes);

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

const { testConnection } = require('./utils/telegram');
testConnection();

const shutdown = (signal) => {
  console.log(`\n⚠️  ${signal} diterima. Menutup server...`);
  server.close(() => {
    db.close((err) => {
      if (err) console.error('❌ Gagal menutup database:', err.message);
      else     console.log('✅ Koneksi database ditutup.');
      process.exit(0);
    });
  });
  setTimeout(() => {
    console.error('⚠️  Timeout — paksa shutdown.');
    process.exit(1);
  }, 10_000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  console.error('⚠️  Unhandled Promise Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err.message);
  process.exit(1);
});
