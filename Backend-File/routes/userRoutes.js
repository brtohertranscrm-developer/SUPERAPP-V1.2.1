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
// 5. CREATE BOOKING (dengan proteksi race condition)
// ==========================================
router.post('/bookings', async (req, res) => {
  try {
    // 1. Tangkap SEMUA kemungkinan format nama (snake_case dan camelCase)
    const { 
      order_id, item_type, item_name, location, start_date, end_date, total_price,
      
      // Versi Snake_case
      base_price, discount_amount, promo_code, service_fee, addon_fee, delivery_fee,
      
      // Versi CamelCase (dari frontend React Native / web)
      basePrice, discountAmount, promoCode, serviceFee, addonFee, deliveryFee
    } = req.body || {};

    // Validasi input
    if (!order_id || !item_type || !item_name || !start_date || !end_date || !total_price) {
      return res.status(400).json({ success: false, error: 'Data booking tidak lengkap.' });
    }

    if (!['motor', 'locker'].includes(item_type)) {
      return res.status(400).json({ success: false, error: 'Tipe item tidak valid.' });
    }

    const parsedPrice = parseInt(total_price);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      return res.status(400).json({ success: false, error: 'Total harga tidak valid.' });
    }

    // Validasi tanggal
    const startDt = new Date(start_date);
    const endDt = new Date(end_date);
    if (isNaN(startDt.getTime()) || isNaN(endDt.getTime())) {
      return res.status(400).json({ success: false, error: 'Format tanggal tidak valid.' });
    }
    if (endDt <= startDt) {
      return res.status(400).json({ success: false, error: 'Tanggal selesai harus setelah tanggal mulai.' });
    }

    // Cek KYC status
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

    // 2. SIAPKAN ANGKA RINCIAN (Pilih mana yang ada isinya)
    const bPrice  = parseInt(base_price || basePrice) || parsedPrice; 
    const dAmount = parseInt(discount_amount || discountAmount) || 0;
    const sFee    = parseInt(service_fee || serviceFee) || 0;
    const aFee    = parseInt(addon_fee || addonFee) || 0;
    const delFee  = parseInt(delivery_fee || deliveryFee) || 0;
    const pCode   = promo_code || promoCode || null;
    
    // Default transaksi baru masuk: paid_amount sama dengan total (sudah transfer di depan)
    const pAmount = parsedPrice;

    // 3. INSERT FULL DATA KE DATABASE
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

    // 1. Tambahkan pemanggilan base_price dan extend_fee di query ini
    const booking = await dbGet(
      `SELECT start_date, end_date, total_price, base_price, status FROM bookings WHERE order_id = ? AND user_id = ?`,
      [orderId, req.user.id]
    );

    if (!booking) {
      return res.status(404).json({ success: false, error: 'Pesanan tidak ditemukan.' });
    }

    if (booking.status !== 'active') {
      return res.status(400).json({ success: false, error: 'Hanya pesanan aktif yang bisa diperpanjang.' });
    }

    const start = new Date(booking.start_date);
    const currentEnd = new Date(booking.end_date);
    const currentDays = Math.max(1, Math.ceil((currentEnd - start) / (1000 * 60 * 60 * 24)));
    
    // 2. Hitung harga harian dari base_price murni, bukan dari total yang sudah bercampur diskon/fee
    const pricePerDay = Math.round((booking.base_price || booking.total_price) / currentDays);
    const extraCost = days * pricePerDay;

    currentEnd.setDate(currentEnd.getDate() + days);
    const newEndDate = currentEnd.toISOString().split('T')[0];

    // 3. Masukkan biaya tambahan ke kolom extend_fee agar muncul di dasbor admin
    await dbRun(
      `UPDATE bookings 
       SET end_date = ?, 
           total_price = total_price + ?, 
           extend_fee = IFNULL(extend_fee, 0) + ?, 
           payment_status = 'unpaid' 
       WHERE order_id = ?`,
      [newEndDate, extraCost, extraCost, orderId]
    );

    res.json({ success: true, new_end_date: newEndDate, extra_cost: extraCost });

  } catch (err) {
    console.error('PUT /bookings/:orderId/extend error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal memperpanjang booking.' });
  }
});

// ==========================================
// 8. CLAIM GAMIFICATION MILES (T&C)
// ==========================================
router.post('/claim-tc-miles', async (req, res) => {
  try {
    const user = await dbGet(
      `SELECT miles, has_completed_tc_gamification FROM users WHERE id = ?`,
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({ success: false, error: 'User tidak ditemukan.' });
    }

    if (user.has_completed_tc_gamification === 1) {
      return res.status(400).json({ success: false, error: 'Anda sudah mengklaim hadiah misi ini sebelumnya.' });
    }

    const MILES_REWARD = 500;

    await dbRun(
      `UPDATE users SET miles = COALESCE(miles, 0) + ?, has_completed_tc_gamification = 1 WHERE id = ?`,
      [MILES_REWARD, req.user.id]
    );

    res.json({
      success: true,
      message: `${MILES_REWARD} Miles berhasil ditambahkan!`,
      miles: (user.miles || 0) + MILES_REWARD
    });

  } catch (err) {
    console.error('POST /claim-tc-miles error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengklaim miles.' });
  }
});

module.exports = router;