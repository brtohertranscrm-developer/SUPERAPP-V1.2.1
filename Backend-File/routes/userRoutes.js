const { notifyNewBooking, notifyExtendBooking, notifyKycPending, notifyGmapsReview } = require('../utils/telegram');
const { calculateMotorRentalBreakdown } = require('../utils/motorRentalPricing');
const { quoteDelivery } = require('../utils/deliveryPricing');
const multer = require('multer');
const path   = require('path');
const crypto = require('crypto');
const fs     = require('fs');
const express = require('express');
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

// ==========================================
// Upload Bukti Transfer (User)
// ==========================================
const ALLOWED_PROOF_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_PROOF_FILE = 5 * 1024 * 1024; // 5MB

const reconStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/reconciliations/';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const rand = crypto.randomBytes(8).toString('hex');
    cb(null, `user-recon-${Date.now()}-${rand}${ext}`);
  },
});

const uploadUserRecon = multer({
  storage: reconStorage,
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
              has_completed_tc_gamification 
       FROM users WHERE id = ?`,
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({ success: false, error: 'User tidak ditemukan.' });
    }

    // Mengambil semua order aktif sebagai array
    const activeOrders = await dbAll(
      `SELECT order_id as id, item_type, item_name as item, status, payment_status, location, 
              start_date as startDate, end_date as endDate, total_price 
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
        if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(400).json({ success: false, error: 'Order ID, bank, nominal, dan tanggal transfer wajib diisi.' });
      }

      const orderId = String(order_id).trim();
      const booking = await dbGet(
        `SELECT order_id, user_id, total_price, payment_status
         FROM bookings WHERE order_id = ? LIMIT 1`,
        [orderId]
      );
      if (!booking) {
        if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(404).json({ success: false, error: 'Order ID tidak ditemukan.' });
      }
      if (booking.user_id !== req.user.id) {
        if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(403).json({ success: false, error: 'Akses ditolak.' });
      }
      if (booking.payment_status === 'paid') {
        if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(400).json({ success: false, error: 'Pesanan ini sudah lunas.' });
      }

      const existingPending = await dbGet(
        `SELECT id FROM payment_reconciliations
         WHERE order_id = ? AND status = 'pending'
         ORDER BY created_at DESC LIMIT 1`,
        [orderId]
      );
      if (existingPending) {
        if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(409).json({
          success: false,
          error: 'Bukti transfer untuk pesanan ini sudah pernah diunggah dan sedang ditinjau.',
        });
      }

      const proofUrl = req.file
        ? `${req.protocol}://${req.get('host')}/uploads/reconciliations/${path.basename(req.file.filename)}`
        : null;

      const amount = parseInt(transfer_amount, 10);
      if (!Number.isFinite(amount) || amount <= 0) {
        if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(400).json({ success: false, error: 'Nominal transfer tidak valid.' });
      }

      const bank = String(bank_name).trim();
      const date = String(transfer_date).trim();

      const result = await dbRun(
        `INSERT INTO payment_reconciliations (order_id, bank_name, transfer_amount, transfer_date, proof_url, notes)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [orderId, bank, amount, date, proofUrl, notes || null]
      );

      res.status(201).json({
        success: true,
        message: 'Bukti transfer berhasil diunggah. Tim admin akan memverifikasi secepatnya.',
        id: result.lastID,
        proof_url: proofUrl,
      });
    } catch (e) {
      console.error('POST /users/payments/reconciliations error:', e.message);
      if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
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
// 5. CREATE BOOKING MOTOR
// ==========================================
router.post('/bookings', async (req, res) => {
  try {
    const { 
      order_id, item_type, item_name, location, start_date, end_date, total_price,
      base_price, discount_amount, promo_code, service_fee, addon_fee, delivery_fee,
      basePrice, discountAmount, promoCode, serviceFee, addonFee, deliveryFee,
      duration_hours, price_notes, payment_method,
      addon_items,
      delivery_type, delivery_station_id, delivery_address, delivery_lat, delivery_lng
    } = req.body || {};

    if (!order_id || !item_type || !item_name || !start_date || !end_date || !total_price) {
      return res.status(400).json({ success: false, error: 'Data booking tidak lengkap.' });
    }

    if (!['motor', 'locker'].includes(item_type)) {
      return res.status(400).json({ success: false, error: 'Tipe item tidak valid.' });
    }

    let finalPrice = parseInt(total_price);
    if (isNaN(finalPrice) || finalPrice <= 0) {
      return res.status(400).json({ success: false, error: 'Total harga tidak valid.' });
    }

    let refPrice = null;
    let rentalBreakdown = null;
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
    const dAmount = parseInt(discount_amount || discountAmount) || 0;
    const sFee    = parseInt(service_fee || serviceFee) || 0;
    const pCode   = promo_code || promoCode || null;
    const billableHours = rentalBreakdown?.billableHours || parseInt(duration_hours) || 0;

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
        if (lineTotal <= 0) continue;

        aFee += lineTotal;
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

    if (item_type === 'motor' && delType && delType !== 'self') {
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

    // Atomic: booking + addon lines
    await dbRun('BEGIN');
    try {
      await dbRun(
        `INSERT INTO bookings (
           order_id, user_id, item_type, item_name, location,
           delivery_type, delivery_station_id, delivery_address, delivery_lat, delivery_lng, delivery_distance_km, delivery_method,
           start_date, end_date, 
           base_price, discount_amount, promo_code, service_fee, extend_fee, addon_fee, delivery_fee,
           paid_amount, total_price, status, payment_status, payment_method, duration_hours, price_notes
         ) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, 'pending', 'unpaid', ?, ?, ?)`,
        [
          order_id, req.user.id, item_type, item_name, location,
          delType || null,
          delivery_station_id || null,
          delivery_address || null,
          (delivery_lat !== undefined && delivery_lat !== null && delivery_lat !== '') ? Number(delivery_lat) : null,
          (delivery_lng !== undefined && delivery_lng !== null && delivery_lng !== '') ? Number(delivery_lng) : null,
          deliveryDistanceKm !== null ? Number(deliveryDistanceKm) : null,
          deliveryMethod || null,
          start_date, end_date, 
          bPrice, dAmount, pCode, sFee, aFee, delFee,
          0, finalPrice, payMethod, billableHours, computedPriceNotes
        ]
      );

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
        { order_id, item_type, item_name, location, start_date, end_date,
          total_price: finalPrice, payment_method: payMethod },
        userData
      ))
      .catch((err) => console.error('[Telegram] booking notify error:', err.message));

    res.status(201).json({ success: true, message: 'Booking berhasil dibuat.', order_id });

  } catch (err) {
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
      `SELECT order_id, user_id, item_type, item_name, location, start_date, end_date,
              delivery_type, delivery_station_id, delivery_address, delivery_lat, delivery_lng, delivery_distance_km, delivery_method,
              base_price, discount_amount, promo_code, service_fee, extend_fee, addon_fee, delivery_fee,
              paid_amount, total_price, status, payment_status, payment_method, duration_hours, price_notes, created_at
       FROM bookings
       WHERE order_id = ? AND user_id = ?
       LIMIT 1`,
      [orderId, req.user.id]
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
      `SELECT order_id, item_name, start_date, end_date, total_price, base_price, status 
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
    const MILES_REWARD = 500;

    const result = await dbRun(
      `UPDATE users 
       SET miles = COALESCE(miles, 0) + ?,
           has_completed_tc_gamification = 1
       WHERE id = ? AND has_completed_tc_gamification = 0`,
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
const reviewStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/reviews/';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, 'review-' + crypto.randomBytes(12).toString('hex') + ext);
  },
});

const uploadReview = multer({
  storage: reviewStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const extOk  = ['.jpg','.jpeg','.png','.webp'].includes(path.extname(file.originalname).toLowerCase());
    const mimeOk = ['image/jpeg','image/png','image/webp'].includes(file.mimetype);
    mimeOk && extOk ? cb(null, true) : cb(new Error('Hanya JPG/PNG/WebP yang diizinkan.'));
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
      var screenshotUrl = req.protocol + '://' + req.get('host') + '/uploads/reviews/' + req.file.filename;

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
