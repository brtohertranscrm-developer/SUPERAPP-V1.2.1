const { notifyNewBooking, notifyExtendBooking, notifyKycPending, notifyGmapsReview } = require('../utils/telegram');
const { calculateMotorRentalBreakdown } = require('../utils/motorRentalPricing');
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
      `INSERT INTO support_tickets (ticket_number, user_id, order_id, subject, message) VALUES (?, ?, ?, ?, ?)`,
      [ticketNumber, req.user.id, order_id || null, subject.trim(), message.trim()]
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
      duration_hours, price_notes
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
        refPrice = motor.base_price;
        rentalBreakdown = calculateMotorRentalBreakdown({
          startDate: start_date,
          endDate: end_date,
          price24h: motor.base_price,
          price12h: motor.price_12h || 0,
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
      const minPrice  = Math.floor(refPrice * days * 0.2); 

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
    const aFee    = parseInt(addon_fee || addonFee) || 0;
    const delFee  = parseInt(delivery_fee || deliveryFee) || 0;
    const pCode   = promo_code || promoCode || null;
    const billableHours = rentalBreakdown?.billableHours || parseInt(duration_hours) || 0;
    finalPrice = Math.max(0, bPrice - dAmount + sFee + aFee + delFee);
    const pAmount = finalPrice;
    const computedPriceNotes = rentalBreakdown
      ? `Motor billing ${rentalBreakdown.packageSummary}`
      : (price_notes || null);

    await dbRun(
      `INSERT INTO bookings (
         order_id, user_id, item_type, item_name, location, start_date, end_date, 
         base_price, discount_amount, promo_code, service_fee, extend_fee, addon_fee, delivery_fee,
         paid_amount, total_price, status, payment_status, duration_hours, price_notes
       ) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, 'active', 'paid', ?, ?)`,
      [
        order_id, req.user.id, item_type, item_name, location, start_date, end_date, 
        bPrice, dAmount, pCode, sFee, aFee, delFee,
        pAmount, finalPrice, billableHours, computedPriceNotes
      ]
    );

    dbGet(`SELECT name, phone FROM users WHERE id = ?`, [req.user.id])
      .then((userData) => notifyNewBooking(
        { order_id, item_type, item_name, location, start_date, end_date,
          total_price: finalPrice, payment_method: req.body.payment_method || 'transfer' },
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
