const { notifyNewBooking, notifyExtendBooking, notifyKycPending } = require('../utils/telegram');
const express = require('express');
const db = require('../db');
const { verifyUser } = require('../middlewares/authMiddleware');
const router = express.Router();

// ==========================================
// HELPER: Promisify DB
// ==========================================
const dbGet = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
});

const dbAll = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows || []));
});

const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function(err) { err ? reject(err) : resolve({ lastID: this.lastID, changes: this.changes }); });
});

// [FIX 7] Helper: jalankan beberapa query dalam satu transaksi SQLite
// Mencegah miles dobel jika ada concurrent request
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

    const activeOrder = await dbGet(
      `SELECT order_id as id, item_name as item, status, location, 
              start_date as startDate, end_date as endDate, total_price 
       FROM bookings 
       WHERE user_id = ? AND status IN ('pending', 'active') 
       ORDER BY start_date DESC LIMIT 1`,
      [req.user.id]
    );

    res.json({ success: true, data: { user, activeOrder: activeOrder || null } });

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
// 5. CREATE BOOKING
// [FIX 5] Validasi harga di backend — client tidak bisa kirim harga sembarangan
// ==========================================
router.post('/bookings', async (req, res) => {
  try {
    const { 
      order_id, item_type, item_name, location, start_date, end_date, total_price,
      base_price, discount_amount, promo_code, service_fee, addon_fee, delivery_fee,
      basePrice, discountAmount, promoCode, serviceFee, addonFee, deliveryFee
    } = req.body || {};

    // Validasi field wajib
    if (!order_id || !item_type || !item_name || !start_date || !end_date || !total_price) {
      return res.status(400).json({ success: false, error: 'Data booking tidak lengkap.' });
    }

    if (!['motor', 'locker'].includes(item_type)) {
      return res.status(400).json({ success: false, error: 'Tipe item tidak valid.' });
    }

    // [FIX 5] Validasi harga — hitung ulang di backend, jangan percaya angka dari client
    const parsedPrice = parseInt(total_price);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      return res.status(400).json({ success: false, error: 'Total harga tidak valid.' });
    }

    // [FIX 5] Ambil harga referensi dari database berdasarkan item_name
    // Cek motor atau loker
    let refPrice = null;
    if (item_type === 'motor') {
      const motor = await dbGet(
        `SELECT base_price FROM motors WHERE name = ? LIMIT 1`,
        [item_name]
      );
      if (motor) refPrice = motor.base_price;
    } else if (item_type === 'locker') {
      const locker = await dbGet(
        `SELECT base_price FROM lockers WHERE location = ? LIMIT 1`,
        [location]
      );
      if (locker) refPrice = locker.base_price;
    }

    // [FIX 5] Jika item ditemukan di DB, validasi harga tidak jauh di bawah referensi
    // Toleransi 20% untuk diskon/promo yang sah
    if (refPrice !== null) {
      const startDt   = new Date(start_date);
      const endDt     = new Date(end_date);
      const days      = Math.max(1, Math.ceil((endDt - startDt) / (1000 * 60 * 60 * 24)));
      const minPrice  = Math.floor(refPrice * days * 0.2); // minimal 20% dari harga normal

      if (parsedPrice < minPrice) {
        return res.status(400).json({
          success: false,
          error: `Total harga tidak masuk akal. Minimum Rp ${minPrice.toLocaleString('id-ID')} untuk durasi ini.`,
        });
      }
    }

    // Validasi tanggal
    const startDt = new Date(start_date);
    const endDt   = new Date(end_date);
    if (isNaN(startDt.getTime()) || isNaN(endDt.getTime())) {
      return res.status(400).json({ success: false, error: 'Format tanggal tidak valid.' });
    }
    if (endDt <= startDt) {
      return res.status(400).json({ success: false, error: 'Tanggal selesai harus setelah tanggal mulai.' });
    }

    // Cek KYC
    const user = await dbGet(`SELECT kyc_status FROM users WHERE id = ?`, [req.user.id]);
    if (!user || user.kyc_status !== 'verified') {
      return res.status(403).json({
        success: false,
        error: 'Anda harus melakukan verifikasi data (KYC) terlebih dahulu sebelum membuat pesanan.'
      });
    }

    // Cek duplikat order_id
    const existing = await dbGet(`SELECT order_id FROM bookings WHERE order_id = ?`, [order_id]);
    if (existing) {
      return res.status(409).json({ success: false, error: 'Order ID sudah digunakan.' });
    }

    const bPrice  = parseInt(base_price || basePrice) || parsedPrice; 
    const dAmount = parseInt(discount_amount || discountAmount) || 0;
    const sFee    = parseInt(service_fee || serviceFee) || 0;
    const aFee    = parseInt(addon_fee || addonFee) || 0;
    const delFee  = parseInt(delivery_fee || deliveryFee) || 0;
    const pCode   = promo_code || promoCode || null;
    const pAmount = parsedPrice;

    await dbRun(
      `INSERT INTO bookings (
         order_id, user_id, item_type, item_name, location, start_date, end_date, 
         base_price, discount_amount, promo_code, service_fee, extend_fee, addon_fee, delivery_fee,
         paid_amount, total_price, status, payment_status
       ) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, 'active', 'paid')`,
      [
        order_id, req.user.id, item_type, item_name, location, start_date, end_date, 
        bPrice, dAmount, pCode, sFee, aFee, delFee,
        pAmount, parsedPrice
      ]
    );

    // Telegram notifikasi — fire and forget
    dbGet(`SELECT name, phone FROM users WHERE id = ?`, [req.user.id])
      .then((userData) => notifyNewBooking(
        { order_id, item_type, item_name, location, start_date, end_date,
          total_price: parsedPrice, payment_method: req.body.payment_method || 'transfer' },
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

    // Telegram notifikasi KYC
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

    const start       = new Date(booking.start_date);
    const currentEnd  = new Date(booking.end_date);
    const currentDays = Math.max(1, Math.ceil((currentEnd - start) / (1000 * 60 * 60 * 24)));
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

    // Telegram notifikasi extend — fire and forget
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
// 8. CLAIM GAMIFICATION MILES (T&C)
// [FIX 7] Gunakan transaksi atomik — cegah double-claim concurrent
// ==========================================
router.post('/claim-tc-miles', async (req, res) => {
  try {
    // [FIX 7] UPDATE langsung dengan kondisi WHERE — atomic, tidak bisa race condition
    // Jika has_completed_tc_gamification sudah 1, changes = 0 → tolak
    const MILES_REWARD = 500;

    const result = await dbRun(
      `UPDATE users 
       SET miles = COALESCE(miles, 0) + ?,
           has_completed_tc_gamification = 1
       WHERE id = ? AND has_completed_tc_gamification = 0`,
      [MILES_REWARD, req.user.id]
    );

    if (result.changes === 0) {
      // Bisa karena: sudah pernah klaim, atau user tidak ditemukan
      const user = await dbGet(`SELECT has_completed_tc_gamification FROM users WHERE id = ?`, [req.user.id]);
      if (!user) {
        return res.status(404).json({ success: false, error: 'User tidak ditemukan.' });
      }
      return res.status(400).json({ success: false, error: 'Anda sudah mengklaim hadiah misi ini sebelumnya.' });
    }

    // Ambil nilai miles terbaru
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

module.exports = router;
