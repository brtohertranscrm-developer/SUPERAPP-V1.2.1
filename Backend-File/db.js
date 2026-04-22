const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// ==========================================
// 1. KONEKSI DATABASE
// ==========================================
const dbPath = path.resolve(__dirname, 'brother_trans.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Gagal terhubung ke database:', err.message);
    process.exit(1);
  }
  console.log('✅ Berhasil terhubung ke database SQLite.');
});

db.run("PRAGMA foreign_keys = ON");
db.run("PRAGMA journal_mode = WAL");

// ==========================================
// 2. HELPER: Tambah kolom jika belum ada
// ==========================================
const addColumnIfNotExists = (tableName, columnName, columnDef) => {
  db.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef}`, (err) => {
    if (err && !err.message.includes("duplicate column name")) {
      console.error(`⚠️  Gagal menambah ${columnName} di ${tableName}:`, err.message);
    }
  });
};

// ==========================================
// 3. SCHEMA — Definisi Tabel
// ==========================================
db.serialize(() => {
  console.log('⏳ Memeriksa dan membuat tabel database...');

  // --- USERS ---
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      phone TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      permissions TEXT DEFAULT '[]',
      kyc_status TEXT DEFAULT 'unverified',
      kyc_code TEXT,
      miles INTEGER DEFAULT 0,
      location TEXT DEFAULT 'Lainnya',
      profile_picture TEXT,
      profile_banner TEXT,
      referral_code TEXT UNIQUE,
      referred_by TEXT,
      reset_token TEXT,
      reset_token_expiry INTEGER,
      has_completed_tc_gamification INTEGER DEFAULT 0,
      bank_account TEXT,
      bank_name TEXT,
      login_attempts INTEGER DEFAULT 0,
      locked_until INTEGER DEFAULT NULL,
      last_login TEXT DEFAULT NULL,
      join_date TEXT NOT NULL
    )
  `);

  // --- LOGIN LOGS (audit trail) ---
  db.run(`
    CREATE TABLE IF NOT EXISTS login_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      ip_address TEXT,
      user_agent TEXT,
      success INTEGER DEFAULT 0,
      reason TEXT,
      attempted_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // --- TOKEN BLACKLIST (JWT revoke saat logout) ---
  // TTL = waktu expired token, agar bisa di-cleanup otomatis
  db.run(`
    CREATE TABLE IF NOT EXISTS token_blacklist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token_hash TEXT UNIQUE NOT NULL,
      user_id TEXT NOT NULL,
      blacklisted_at TEXT DEFAULT (datetime('now')),
      expires_at INTEGER NOT NULL
    )
  `);

  // --- MOTORS (Katalog) ---
  db.run(`
    CREATE TABLE IF NOT EXISTS motors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      location TEXT DEFAULT 'Yogyakarta',
      cc INTEGER DEFAULT 125,
      base_price INTEGER NOT NULL,
      price_12h INTEGER DEFAULT 0,
      stock INTEGER NOT NULL DEFAULT 0,
      image_url TEXT,
      allow_dynamic_pricing INTEGER DEFAULT 1,
      vendor_user_id TEXT,
      vendor_rate REAL DEFAULT 0
    )
  `);

  // --- MOTOR UNITS (Plat Nomor per Motor) ---
  db.run(`
    CREATE TABLE IF NOT EXISTS motor_units (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      motor_id INTEGER NOT NULL,
      plate_number TEXT UNIQUE NOT NULL,
      status TEXT DEFAULT 'RDY',
      condition_notes TEXT,
      FOREIGN KEY (motor_id) REFERENCES motors(id) ON DELETE CASCADE
    )
  `);

  // --- LOCKERS ---
  db.run(`
    CREATE TABLE IF NOT EXISTS lockers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      location TEXT NOT NULL,
      size TEXT NOT NULL,
      base_price INTEGER NOT NULL,
      stock INTEGER NOT NULL,
      type TEXT DEFAULT 'terbuka',
      price_1h INTEGER DEFAULT 5000,
      price_12h INTEGER DEFAULT 35000,
      price_24h INTEGER DEFAULT 50000,
      dimensions TEXT
    )
  `);

  // --- BOOKINGS ---
  // [FIX 3] Kolom rincian harga ditambahkan langsung ke schema
  db.run(`
    CREATE TABLE IF NOT EXISTS bookings (
      order_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      item_type TEXT NOT NULL,
      item_name TEXT NOT NULL,
      location TEXT,
      delivery_type TEXT,
      delivery_station_id TEXT,
      delivery_address TEXT,
      delivery_lat REAL,
      delivery_lng REAL,
      delivery_distance_km REAL,
      delivery_method TEXT,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      base_price INTEGER DEFAULT 0,
      discount_amount INTEGER DEFAULT 0,
      promo_code TEXT,
      service_fee INTEGER DEFAULT 0,
      extend_fee INTEGER DEFAULT 0,
      addon_fee INTEGER DEFAULT 0,
      delivery_fee INTEGER DEFAULT 0,
      paid_amount INTEGER DEFAULT 0,
      price_notes TEXT,
      total_price INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      payment_status TEXT DEFAULT 'paid',
      payment_method TEXT DEFAULT 'transfer',
      unit_id INTEGER,
      plate_number TEXT,
      duration_hours INTEGER DEFAULT 1,
      pickup_fee INTEGER DEFAULT 0,
      drop_fee INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // --- BOOKING PRICING SETTINGS (Global) ---
  // Mode hitung motor: "calendar" (per tanggal) atau "stopwatch" (selisih durasi total)
  db.run(`
    CREATE TABLE IF NOT EXISTS booking_pricing_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      motor_billing_mode TEXT NOT NULL DEFAULT 'calendar',
      motor_threshold_12h INTEGER NOT NULL DEFAULT 12,
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.run(
    `INSERT OR IGNORE INTO booking_pricing_settings (id, motor_billing_mode, motor_threshold_12h)
     VALUES (1, 'calendar', 12)`
  );

  // --- PRICE RULES (Surge & Seasonal) ---
  db.run(`
    CREATE TABLE IF NOT EXISTS price_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rule_type TEXT NOT NULL,
      name TEXT,
      start_date TEXT,
      end_date TEXT,
      stock_condition INTEGER,
      markup_percentage INTEGER NOT NULL,
      is_active INTEGER DEFAULT 1
    )
  `);

  // --- SUPPORT TICKETS ---
  db.run(`
    CREATE TABLE IF NOT EXISTS support_tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_number TEXT UNIQUE NOT NULL,
      user_id TEXT NOT NULL,
      order_id TEXT,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT DEFAULT 'open',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // --- REFERRAL LOGS ---
  db.run(`
    CREATE TABLE IF NOT EXISTS referral_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      referrer_id TEXT NOT NULL,
      referee_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'registered',
      miles_referee INTEGER NOT NULL DEFAULT 0,
      miles_referrer INTEGER NOT NULL DEFAULT 0,
      tier_bonus_awarded INTEGER NOT NULL DEFAULT 0,
      tier_label TEXT,
      registered_at TEXT DEFAULT (datetime('now')),
      first_booking_at TEXT,
      FOREIGN KEY (referrer_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (referee_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(referee_id)
    )
  `);

  // --- PROMOTIONS ---
  db.run(`
    CREATE TABLE IF NOT EXISTS promotions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      code TEXT NOT NULL,
      image TEXT NOT NULL,
      desc TEXT,
      tag TEXT,
      is_active INTEGER DEFAULT 1,
      usage_limit INTEGER DEFAULT 0,
      current_usage INTEGER DEFAULT 0,
      discount_percent INTEGER DEFAULT 0,
      max_discount INTEGER DEFAULT 0
    )
  `);

  // --- ARTICLES ---
  db.run(`
    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT UNIQUE,
      category TEXT DEFAULT 'Berita',
      image_url TEXT,
      content TEXT NOT NULL,
      status TEXT DEFAULT 'draft',
      meta_title TEXT,
      meta_desc TEXT,
      geo_location TEXT,
      scheduled_at TEXT,
      views INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // ==========================================
  // [FINANCE] TABEL
  // ==========================================

  // --- EXPENSES ---
  db.run(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      motor_unit_id INTEGER,
      amount INTEGER NOT NULL,
      description TEXT,
      receipt_url TEXT,
      expense_date TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (motor_unit_id) REFERENCES motor_units(id) ON DELETE SET NULL,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  // --- PAYMENT RECONCILIATIONS ---
  db.run(`
    CREATE TABLE IF NOT EXISTS payment_reconciliations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT NOT NULL,
      bank_name TEXT NOT NULL,
      transfer_amount INTEGER NOT NULL,
      transfer_date TEXT NOT NULL,
      proof_url TEXT,
      status TEXT DEFAULT 'pending',
      notes TEXT,
      reconciled_by TEXT,
      reconciled_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (order_id) REFERENCES bookings(order_id),
      FOREIGN KEY (reconciled_by) REFERENCES users(id)
    )
  `);

  // --- VENDOR PAYOUTS ---
  db.run(`
    CREATE TABLE IF NOT EXISTS vendor_payouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vendor_user_id TEXT NOT NULL,
      period_start TEXT NOT NULL,
      period_end TEXT NOT NULL,
      gross_revenue INTEGER NOT NULL DEFAULT 0,
      commission_rate REAL NOT NULL DEFAULT 0,
      commission_amount INTEGER NOT NULL DEFAULT 0,
      status TEXT DEFAULT 'pending',
      transfer_proof TEXT,
      notes TEXT,
      approved_by TEXT,
      approved_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (vendor_user_id) REFERENCES users(id),
      FOREIGN KEY (approved_by) REFERENCES users(id)
    )
  `);

  // ==========================================
  // [LOKER V2] TABEL
  // ==========================================

  // --- LOCKER ADDONS ---
  db.run(`
    CREATE TABLE IF NOT EXISTS locker_addons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      price INTEGER NOT NULL DEFAULT 0,
      addon_type TEXT NOT NULL DEFAULT 'pickup',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // --- PROMO USAGE (cegah duplikat pemakaian promo per user) ---
  db.run(`
    CREATE TABLE IF NOT EXISTS promo_usage (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      promo_id INTEGER NOT NULL,
      user_id  TEXT NOT NULL,
      order_id TEXT,
      used_at  TEXT DEFAULT (datetime('now')),
      UNIQUE(promo_id, user_id),
      FOREIGN KEY (promo_id) REFERENCES promotions(id)
    )
  `);

  // --- TOKEN BLACKLIST (JWT revoke saat logout) ---
  db.run(`
    CREATE TABLE IF NOT EXISTS token_blacklist (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      token_hash     TEXT UNIQUE NOT NULL,
      user_id        TEXT NOT NULL,
      blacklisted_at TEXT DEFAULT (datetime('now')),
      expires_at     INTEGER NOT NULL
    )
  `);

  // --- LOGIN LOGS (audit trail) ---
  db.run(`
    CREATE TABLE IF NOT EXISTS login_logs (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id      TEXT,
      ip_address   TEXT,
      user_agent   TEXT,
      success      INTEGER DEFAULT 0,
      reason       TEXT,
      attempted_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // --- GMAPS REVIEWS (submission bukti review Google Maps) ---
  db.run(`
    CREATE TABLE IF NOT EXISTS gmaps_reviews (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id         TEXT NOT NULL,
      order_id        TEXT,
      screenshot_url  TEXT NOT NULL,
      status          TEXT DEFAULT 'pending',
      reviewed_by     TEXT,
      reviewed_at     TEXT,
      reject_reason   TEXT,
      miles_awarded   INTEGER DEFAULT 0,
      submitted_at    TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id)     REFERENCES users(id),
      FOREIGN KEY (order_id)    REFERENCES bookings(order_id),
      FOREIGN KEY (reviewed_by) REFERENCES users(id)
    )
  `);

  // ==========================================
  // 4. MIGRASI — Tambah kolom baru (aman diulang)
  // ==========================================

  // Users — kolom lama
  addColumnIfNotExists('users', 'kyc_code', 'TEXT');
  addColumnIfNotExists('users', 'permissions', "TEXT DEFAULT '[]'");
  addColumnIfNotExists('users', 'location', 'TEXT DEFAULT "Lainnya"');
  addColumnIfNotExists('users', 'has_completed_tc_gamification', 'INTEGER DEFAULT 0');
  addColumnIfNotExists('users', 'bank_account', 'TEXT');
  addColumnIfNotExists('users', 'bank_name', 'TEXT');
  addColumnIfNotExists('users', 'referred_by', 'TEXT');
  addColumnIfNotExists('users', 'has_reviewed_gmaps', 'INTEGER DEFAULT 0');

  // [FIX 3] Users — kolom auth yang sebelumnya hilang
  addColumnIfNotExists('users', 'login_attempts', 'INTEGER DEFAULT 0');
  addColumnIfNotExists('users', 'locked_until',   'INTEGER DEFAULT NULL');
  addColumnIfNotExists('users', 'last_login',      'TEXT DEFAULT NULL');

  // Bookings — kolom lama
  addColumnIfNotExists('bookings', 'payment_status',  'TEXT DEFAULT "paid"');
  addColumnIfNotExists('bookings', 'unit_id',          'INTEGER');
  addColumnIfNotExists('bookings', 'plate_number',     'TEXT');
  addColumnIfNotExists('bookings', 'created_at',       'TEXT');
  addColumnIfNotExists('bookings', 'payment_method',   "TEXT DEFAULT 'transfer'");
  addColumnIfNotExists('bookings', 'duration_hours',   'INTEGER DEFAULT 1');
  addColumnIfNotExists('bookings', 'pickup_fee',       'INTEGER DEFAULT 0');
  addColumnIfNotExists('bookings', 'drop_fee',         'INTEGER DEFAULT 0');
  // Delivery details (motor handover)
  addColumnIfNotExists('bookings', 'delivery_type',        'TEXT');
  addColumnIfNotExists('bookings', 'delivery_station_id',  'TEXT');
  addColumnIfNotExists('bookings', 'delivery_address',     'TEXT');
  addColumnIfNotExists('bookings', 'delivery_lat',         'REAL');
  addColumnIfNotExists('bookings', 'delivery_lng',         'REAL');
  addColumnIfNotExists('bookings', 'delivery_distance_km', 'REAL');
  addColumnIfNotExists('bookings', 'delivery_method',      'TEXT');

  // [FIX 3] Bookings — kolom rincian harga yang sebelumnya hilang
  addColumnIfNotExists('bookings', 'base_price',      'INTEGER DEFAULT 0');
  addColumnIfNotExists('bookings', 'discount_amount', 'INTEGER DEFAULT 0');
  addColumnIfNotExists('bookings', 'promo_code',      'TEXT');
  addColumnIfNotExists('bookings', 'service_fee',     'INTEGER DEFAULT 0');
  addColumnIfNotExists('bookings', 'extend_fee',      'INTEGER DEFAULT 0');
  addColumnIfNotExists('bookings', 'addon_fee',       'INTEGER DEFAULT 0');
  addColumnIfNotExists('bookings', 'delivery_fee',    'INTEGER DEFAULT 0');
  addColumnIfNotExists('bookings', 'paid_amount',     'INTEGER DEFAULT 0');
  addColumnIfNotExists('bookings', 'price_notes',     'TEXT');

  // Motors
  addColumnIfNotExists('motors', 'location',               'TEXT DEFAULT "Yogyakarta"');
  addColumnIfNotExists('motors', 'price_12h',              'INTEGER DEFAULT 0');
  addColumnIfNotExists('motors', 'allow_dynamic_pricing',  'INTEGER DEFAULT 1');
  addColumnIfNotExists('motors', 'vendor_user_id',         'TEXT');
  addColumnIfNotExists('motors', 'vendor_rate',            'REAL DEFAULT 0');

  // Promotions
  addColumnIfNotExists('promotions', 'usage_limit',      'INTEGER DEFAULT 0');
  addColumnIfNotExists('promotions', 'current_usage',    'INTEGER DEFAULT 0');
  addColumnIfNotExists('promotions', 'discount_percent', 'INTEGER DEFAULT 0');
  addColumnIfNotExists('promotions', 'max_discount',     'INTEGER DEFAULT 0');

  // Articles
  addColumnIfNotExists('articles', 'slug',         'TEXT');
  addColumnIfNotExists('articles', 'meta_title',   'TEXT');
  addColumnIfNotExists('articles', 'meta_desc',    'TEXT');
  addColumnIfNotExists('articles', 'geo_location', 'TEXT');
  addColumnIfNotExists('articles', 'views',        'INTEGER DEFAULT 0');

  // Lockers
  addColumnIfNotExists('lockers', 'type',       "TEXT DEFAULT 'terbuka'");
  addColumnIfNotExists('lockers', 'price_1h',   'INTEGER DEFAULT 5000');
  addColumnIfNotExists('lockers', 'price_12h',  'INTEGER DEFAULT 35000');
  addColumnIfNotExists('lockers', 'price_24h',  'INTEGER DEFAULT 50000');
  addColumnIfNotExists('lockers', 'dimensions', 'TEXT');

  // ==========================================
  // 5. INDEXES
  // ==========================================

  db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_users_kyc_status ON users(kyc_status)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by)`);

  db.run(`CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_bookings_dates ON bookings(start_date, end_date)`);

  db.run(`CREATE INDEX IF NOT EXISTS idx_motor_units_motor_id ON motor_units(motor_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_motor_units_status ON motor_units(status)`);

  db.run(`CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug)`);

  db.run(`CREATE INDEX IF NOT EXISTS idx_price_rules_type ON price_rules(rule_type, is_active)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_promotions_code ON promotions(code)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_id)`);

  // Finance indexes
  db.run(`CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_expenses_created_by ON expenses(created_by)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_reconciliations_order_id ON payment_reconciliations(order_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_reconciliations_status ON payment_reconciliations(status)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_reconciliations_created_at ON payment_reconciliations(created_at)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_payouts_vendor_id ON vendor_payouts(vendor_user_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_payouts_status ON vendor_payouts(status)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_payouts_period ON vendor_payouts(period_start, period_end)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_motors_vendor ON motors(vendor_user_id)`);

  // Locker indexes
  db.run(`CREATE INDEX IF NOT EXISTS idx_lockers_type ON lockers(type)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_locker_addons_type ON locker_addons(addon_type, is_active)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_bookings_duration ON bookings(duration_hours)`);

  // Referral indexes
  db.run(`CREATE INDEX IF NOT EXISTS idx_referral_logs_referrer ON referral_logs(referrer_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_referral_logs_referee  ON referral_logs(referee_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_referral_logs_status   ON referral_logs(status)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_referral_logs_date     ON referral_logs(registered_at)`);

  // [FIX 1] Token blacklist indexes
  db.run(`CREATE INDEX IF NOT EXISTS idx_token_blacklist_hash       ON token_blacklist(token_hash)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_token_blacklist_expires_at ON token_blacklist(expires_at)`);

  // Login logs indexes
  db.run(`CREATE INDEX IF NOT EXISTS idx_login_logs_user_id      ON login_logs(user_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_login_logs_attempted_at ON login_logs(attempted_at)`);

  // [FIX P3] Promo usage index
  db.run(`CREATE INDEX IF NOT EXISTS idx_promo_usage_promo_user ON promo_usage(promo_id, user_id)`);

  // GMaps reviews indexes
  db.run(`CREATE INDEX IF NOT EXISTS idx_gmaps_reviews_user_id ON gmaps_reviews(user_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_gmaps_reviews_status  ON gmaps_reviews(status)`);

  console.log('✅ Semua tabel, migrasi & index berhasil diverifikasi!');
});

module.exports = db;
