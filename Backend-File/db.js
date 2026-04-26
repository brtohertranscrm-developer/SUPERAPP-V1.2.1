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
      ktp_id TEXT,
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

  // --- KTP BLACKLIST ---
  // Dipakai untuk menolak registrasi berdasarkan ID KTP yang bermasalah.
  db.run(`
    CREATE TABLE IF NOT EXISTS ktp_blacklist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ktp_id TEXT UNIQUE NOT NULL,
      reason TEXT,
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now'))
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
      display_name TEXT,
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

  // --- CARS (Katalog Mobil) ---
  // Mobil punya konsep "model" (cars) dan "unit fisik" (car_units)
  // Karena mobil bisa dipindah lintas kota, lokasi disimpan di car_units.current_location (dinamis).
  db.run(`
    CREATE TABLE IF NOT EXISTS cars (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      display_name TEXT,
      category TEXT DEFAULT 'car',
      seats INTEGER DEFAULT 4,
      transmission TEXT DEFAULT 'AT',
      base_price INTEGER NOT NULL DEFAULT 0,
      image_url TEXT,
      description TEXT
    )
  `);

  // --- CAR UNITS (Plat Nomor per Mobil) ---
  db.run(`
    CREATE TABLE IF NOT EXISTS car_units (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      car_id INTEGER NOT NULL,
      plate_number TEXT UNIQUE NOT NULL,
      status TEXT DEFAULT 'RDY',
      current_location TEXT DEFAULT 'Yogyakarta',
      condition_notes TEXT,
      FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE
    )
  `);

  // --- MOTOR ADDONS / PAKET (Upsell saat checkout motor) ---
  // addon_type:
  //   - 'addon'   (contoh: helm tambahan, holder HP)
  //   - 'package' (contoh: paket wisata / city tour)
  db.run(`
    CREATE TABLE IF NOT EXISTS motor_addons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      price INTEGER NOT NULL DEFAULT 0,
      addon_type TEXT NOT NULL DEFAULT 'addon',
      allow_quantity INTEGER DEFAULT 0,
      max_qty INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
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

  // Line items add-on per booking (audit-friendly)
  // Didefinisikan setelah tabel bookings agar foreign key selalu valid saat CREATE TABLE.
  db.run(`
    CREATE TABLE IF NOT EXISTS booking_motor_addons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT NOT NULL,
      addon_id INTEGER NOT NULL,
      name_snapshot TEXT NOT NULL,
      addon_type_snapshot TEXT NOT NULL,
      qty INTEGER NOT NULL DEFAULT 1,
      unit_price INTEGER NOT NULL DEFAULT 0,
      total_price INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (order_id) REFERENCES bookings(order_id) ON DELETE CASCADE,
      FOREIGN KEY (addon_id) REFERENCES motor_addons(id) ON DELETE RESTRICT
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

  // --- UNIT BLOCKS (Manual block jadwal unit) ---
  // Dipakai untuk: buffer cleaning, servis, unit dipinjam internal, dll.
  db.run(`
    CREATE TABLE IF NOT EXISTS unit_blocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      unit_id INTEGER NOT NULL,
      start_at TEXT NOT NULL,
      end_at TEXT NOT NULL,
      reason TEXT,
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (unit_id) REFERENCES motor_units(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  // --- CAR UNIT BLOCKS (Manual block jadwal mobil) ---
  db.run(`
    CREATE TABLE IF NOT EXISTS car_unit_blocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      car_unit_id INTEGER NOT NULL,
      start_at TEXT NOT NULL,
      end_at TEXT NOT NULL,
      reason TEXT,
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (car_unit_id) REFERENCES car_units(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  // --- LOGISTICS TASKS (Jadwal Pengantaran/Pengembalian Unit) ---
  // task_type:
  //   - 'delivery' (pengantaran unit)
  //   - 'return'   (pengembalian unit)
  // status:
  //   - 'scheduled' | 'completed' | 'cancelled'
  db.run(`
    CREATE TABLE IF NOT EXISTS logistics_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_type TEXT NOT NULL,
      order_id TEXT,
      unit_id INTEGER,
      motor_type TEXT,
      customer_name TEXT,
      customer_phone TEXT,
      location_text TEXT,
      scheduled_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'scheduled',
      assigned_to_name TEXT,
      notes TEXT,
      completed_at TEXT,
      completed_by TEXT,
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (order_id) REFERENCES bookings(order_id) ON DELETE SET NULL,
      FOREIGN KEY (unit_id) REFERENCES motor_units(id) ON DELETE SET NULL,
      FOREIGN KEY (completed_by) REFERENCES users(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);
  db.run(`CREATE INDEX IF NOT EXISTS idx_logistics_tasks_type_status_time ON logistics_tasks(task_type, status, scheduled_at)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_logistics_tasks_order_id ON logistics_tasks(order_id)`);

  // --- EMPLOYEES (Manning: Karyawan Tim Pengantar/Operasional) ---
  // Dipakai untuk menampilkan "siapa on-duty/off" di akun tim pengantar.
  // Catatan: ini bukan tabel user login. Karyawan di sini adalah data operasional.
  db.run(`
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      base_location TEXT DEFAULT 'Yogyakarta',
      role_tag TEXT DEFAULT 'delivery',
      is_active INTEGER DEFAULT 1,
      user_id TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.run(`CREATE INDEX IF NOT EXISTS idx_employees_active_location ON employees(is_active, base_location)`);
  // Migration: add user_id column for existing databases
  db.run(`ALTER TABLE employees ADD COLUMN user_id TEXT`, () => {});

  // --- CUSTOM ORDER REQUESTS (Permintaan unit antar kota) ---
  db.run(`
    CREATE TABLE IF NOT EXISTS custom_order_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      user_name TEXT,
      user_phone TEXT,
      unit_type TEXT NOT NULL,
      from_city TEXT NOT NULL,
      to_city TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      duration_days INTEGER,
      notes TEXT,
      status TEXT DEFAULT 'pending',
      admin_notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);
  db.run(`CREATE INDEX IF NOT EXISTS idx_custom_orders_status ON custom_order_requests(status, created_at)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_custom_orders_user ON custom_order_requests(user_id)`);

  // --- EMPLOYEE AVAILABILITY (Per tanggal) ---
  // status:
  //   - 'on'    (on duty)
  //   - 'off'   (libur)
  //   - 'leave' (cuti)
  //   - 'sick'  (sakit)
  db.run(`
    CREATE TABLE IF NOT EXISTS employee_availability (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      status TEXT NOT NULL,
      note TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(employee_id, date),
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    )
  `);
  db.run(`CREATE INDEX IF NOT EXISTS idx_employee_availability_date ON employee_availability(date)`);

  // --- ADMIN AUDIT LOGS ---
  // Audit trail untuk aksi admin (booking, finance, kyc, armada, dll).
  db.run(`
    CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id TEXT,
      admin_role TEXT,
      action TEXT NOT NULL,
      method TEXT NOT NULL,
      path TEXT NOT NULL,
      status_code INTEGER,
      ip_address TEXT,
      user_agent TEXT,
      context TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (admin_id) REFERENCES users(id)
    )
  `);

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

  // --- PARTNERSHIPS (Homepage: Partner Brother Trans) ---
  db.run(`
    CREATE TABLE IF NOT EXISTS partners (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT DEFAULT 'Partner',
      city TEXT DEFAULT 'Yogyakarta',
      address TEXT,
      headline TEXT,
      promo_text TEXT,
      terms TEXT,
      image_url TEXT,
      cta_label TEXT DEFAULT 'Lihat Promo',
      cta_url TEXT,
      maps_url TEXT,
      phone_wa TEXT,
      sort_order INTEGER DEFAULT 0,
      valid_until TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // --- PARTNER VOUCHERS (Klaim promo partner oleh user) ---
  // status:
  //   - 'claimed'  (sudah diklaim, belum dipakai)
  //   - 'used'     (sudah ditukarkan)
  //   - 'expired'  (sudah lewat masa berlaku)
  db.run(`
    CREATE TABLE IF NOT EXISTS partner_vouchers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      voucher_code TEXT UNIQUE NOT NULL,
      partner_id INTEGER NOT NULL,
      user_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'claimed',
      claimed_at TEXT DEFAULT (datetime('now')),
      used_at TEXT,
      validated_by TEXT,
      validation_note TEXT,
      FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (validated_by) REFERENCES users(id)
    )
  `);
  db.run(`CREATE INDEX IF NOT EXISTS idx_partner_vouchers_user_status ON partner_vouchers(user_id, status, claimed_at DESC)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_partner_vouchers_partner_status ON partner_vouchers(partner_id, status, claimed_at DESC)`);

  // --- MILES REWARDS (Tukar Miles → Voucher internal) ---
  // reward_type:
  //   - 'discount' (diskon % dengan max_discount)
  // allowed_item_types: CSV seperti "motor,car,locker" (kosong = semua)
  db.run(`
    CREATE TABLE IF NOT EXISTS miles_rewards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      reward_type TEXT NOT NULL DEFAULT 'percent',
      miles_cost INTEGER NOT NULL DEFAULT 0,
      discount_percent INTEGER NOT NULL DEFAULT 0,
      max_discount INTEGER NOT NULL DEFAULT 0,
      discount_amount INTEGER NOT NULL DEFAULT 0,
      min_order_amount INTEGER NOT NULL DEFAULT 0,
      desc TEXT,
      allowed_item_types TEXT,
      rule_json TEXT,
      valid_days INTEGER NOT NULL DEFAULT 30,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.run(`CREATE INDEX IF NOT EXISTS idx_miles_rewards_active_cost ON miles_rewards(is_active, miles_cost)`);

  // --- MILES VOUCHERS (kode voucher terikat user) ---
  // status:
  //   - 'active' | 'used' | 'cancelled' | 'expired'
  db.run(`
    CREATE TABLE IF NOT EXISTS miles_vouchers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      voucher_code TEXT UNIQUE NOT NULL,
      user_id TEXT NOT NULL,
      reward_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now')),
      expires_at TEXT,
      used_at TEXT,
      used_order_id TEXT,
      cancelled_at TEXT,
      cancel_reason TEXT,
      idempotency_key TEXT,
      UNIQUE(user_id, idempotency_key),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (reward_id) REFERENCES miles_rewards(id) ON DELETE CASCADE
    )
  `);
  db.run(`CREATE INDEX IF NOT EXISTS idx_miles_vouchers_user_status ON miles_vouchers(user_id, status, created_at DESC)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_miles_vouchers_code ON miles_vouchers(voucher_code)`);

  // --- MILES LEDGER (audit + refund) ---
  // type: 'earn' | 'redeem' | 'refund' | 'adjust'
  db.run(`
    CREATE TABLE IF NOT EXISTS miles_ledger (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      amount INTEGER NOT NULL,
      ref_type TEXT,
      ref_id TEXT,
      note TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      created_by TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  db.run(`CREATE INDEX IF NOT EXISTS idx_miles_ledger_user_time ON miles_ledger(user_id, created_at DESC)`);

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

  // --- EMAIL OTP (verifikasi email sebelum login) ---
  // Satu OTP aktif per user (kode di-hash, TTL, attempts, resend throttling).
  db.run(`
    CREATE TABLE IF NOT EXISTS email_otps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      email TEXT NOT NULL,
      code_hash TEXT NOT NULL,
      expires_at_sec INTEGER NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      sent_hour_start_sec INTEGER,
      sent_count_hour INTEGER NOT NULL DEFAULT 0,
      last_sent_at_sec INTEGER,
      verified_at_sec INTEGER,
      created_at_sec INTEGER NOT NULL DEFAULT (strftime('%s','now')),
      UNIQUE(user_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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
  addColumnIfNotExists('users', 'email_verified', 'INTEGER DEFAULT 0');
  addColumnIfNotExists('users', 'bank_account', 'TEXT');
  addColumnIfNotExists('users', 'bank_name', 'TEXT');
  addColumnIfNotExists('users', 'referred_by', 'TEXT');
  addColumnIfNotExists('users', 'has_reviewed_gmaps', 'INTEGER DEFAULT 0');
  addColumnIfNotExists('users', 'ktp_id', 'TEXT');

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
  // Trip info (out-of-town flag handled by scope)
  addColumnIfNotExists('bookings', 'trip_scope',           'TEXT');
  addColumnIfNotExists('bookings', 'trip_destination',     'TEXT');

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
  addColumnIfNotExists('motors', 'display_name',           'TEXT');
  addColumnIfNotExists('motors', 'price_12h',              'INTEGER DEFAULT 0');
  addColumnIfNotExists('motors', 'allow_dynamic_pricing',  'INTEGER DEFAULT 1');
  addColumnIfNotExists('motors', 'vendor_user_id',         'TEXT');
  addColumnIfNotExists('motors', 'vendor_rate',            'REAL DEFAULT 0');

  // Backfill nama tampil agar data lama tetap rapi di katalog publik.
  db.run(`
    UPDATE motors
    SET display_name = name
    WHERE display_name IS NULL OR trim(display_name) = ''
  `);

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

  // Unit Blocks — additional fields for day-timeline (multi-slot)
  addColumnIfNotExists('unit_blocks', 'block_type',     'TEXT');
  addColumnIfNotExists('unit_blocks', 'customer_name',  'TEXT');
  addColumnIfNotExists('unit_blocks', 'customer_phone', 'TEXT');
  addColumnIfNotExists('unit_blocks', 'notes',          'TEXT');

  // Tier & season system
  addColumnIfNotExists('users', 'user_tier',           "TEXT DEFAULT 'backpacker'");
  addColumnIfNotExists('users', 'season_trip_count',   'INTEGER DEFAULT 0');
  addColumnIfNotExists('users', 'season_miles_earned', 'INTEGER DEFAULT 0');
  addColumnIfNotExists('users', 'season_start_date',   "TEXT DEFAULT (date('now'))");

  // Miles rewards — future-proof columns
  addColumnIfNotExists('miles_rewards', 'discount_amount', 'INTEGER NOT NULL DEFAULT 0');
  addColumnIfNotExists('miles_rewards', 'desc', 'TEXT');
  addColumnIfNotExists('miles_rewards', 'rule_json', 'TEXT');

  // Seed default miles rewards (aman diulang) — diletakkan setelah migrasi kolom
  db.run(
    `INSERT OR IGNORE INTO miles_rewards
      (id, title, reward_type, miles_cost, discount_percent, max_discount, discount_amount, min_order_amount, allowed_item_types, valid_days, is_active)
     VALUES
      (1, 'Voucher Diskon 10% (Max Rp 25.000)', 'percent', 300, 10, 25000, 0, 0, 'motor,car,locker', 30, 1),
      (2, 'Voucher Diskon 15% (Max Rp 50.000)', 'percent', 700, 15, 50000, 0, 0, 'motor,car,locker', 30, 1),
      (3, 'Voucher Diskon 20% (Max Rp 75.000)', 'percent', 1200, 20, 75000, 0, 0, 'motor,car,locker', 30, 1)
    `
  );

  // User claimed promotions
  db.run(`
    CREATE TABLE IF NOT EXISTS user_promotions (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     TEXT NOT NULL,
      promo_id    INTEGER NOT NULL,
      claimed_at  TEXT DEFAULT (datetime('now')),
      status      TEXT DEFAULT 'active',
      UNIQUE(user_id, promo_id),
      FOREIGN KEY (user_id)  REFERENCES users(id),
      FOREIGN KEY (promo_id) REFERENCES promotions(id)
    )
  `);

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
  db.run(`CREATE INDEX IF NOT EXISTS idx_motor_addons_active ON motor_addons(is_active, addon_type, sort_order)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_booking_motor_addons_order ON booking_motor_addons(order_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_booking_motor_addons_addon ON booking_motor_addons(addon_id)`);

  db.run(`CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug)`);

  db.run(`CREATE INDEX IF NOT EXISTS idx_price_rules_type ON price_rules(rule_type, is_active)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_promotions_code ON promotions(code)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_users_ktp_id ON users(ktp_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_ktp_blacklist_ktp_id ON ktp_blacklist(ktp_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_email_otps_email ON email_otps(email)`);

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

  // Unit blocks + audit logs indexes
  db.run(`CREATE INDEX IF NOT EXISTS idx_unit_blocks_unit_id ON unit_blocks(unit_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_car_units_car_id ON car_units(car_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_car_units_status ON car_units(status)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_car_unit_blocks_car_unit_id ON car_unit_blocks(car_unit_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_car_unit_blocks_time ON car_unit_blocks(start_at, end_at)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_unit_blocks_range ON unit_blocks(start_at, end_at)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_id ON admin_audit_logs(admin_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON admin_audit_logs(created_at)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_path ON admin_audit_logs(path)`);

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
