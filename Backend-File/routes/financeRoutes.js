const { notifyPaymentConfirmed } = require('../utils/telegram');
const express = require('express');
const db = require('../db');
const { verifyAdmin, requirePermission } = require('../middlewares/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
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

// ==========================================
// FILE UPLOAD — Bukti transfer & struk pengeluaran
// ==========================================
const ALLOWED_FINANCE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_FINANCE_FILE = 5 * 1024 * 1024; // 5MB

const financeStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/finance/';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const prefix = req.originalUrl.includes('reconcil') ? 'recon' : 'expense';
    cb(null, `${prefix}-${Date.now()}${ext}`);
  }
});

const uploadFinance = multer({
  storage: financeStorage,
  limits: { fileSize: MAX_FINANCE_FILE },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_FINANCE_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Hanya JPG, PNG, WebP, atau PDF yang diizinkan.'));
    }
  }
});

// Semua route finance butuh verifikasi admin
router.use(verifyAdmin);

// ==========================================
// REKONSILIASI PEMBAYARAN (Akses: finance)
// ==========================================

router.get('/reconciliations', requirePermission('finance'), async (req, res) => {
  try {
    const { status } = req.query;
    const params = [];
    let whereClause = '';

    if (status && status !== 'all') {
      whereClause = 'WHERE r.status = ?';
      params.push(status);
    }

    const rows = await dbAll(
      `SELECT r.*,
              b.item_name, b.total_price, b.item_type,
              u.name as customer_name, u.phone as customer_phone,
              a.name as reconciled_by_name
       FROM payment_reconciliations r
       LEFT JOIN bookings b ON r.order_id = b.order_id
       LEFT JOIN users u ON b.user_id = u.id
       LEFT JOIN users a ON r.reconciled_by = a.id
       ${whereClause}
       ORDER BY r.created_at DESC`,
      params
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /finance/reconciliations error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil data rekonsiliasi.' });
  }
});

router.post('/reconciliations', requirePermission('finance'), (req, res) => {
  uploadFinance.single('proof')(req, res, async (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ success: false, error: 'Ukuran file terlalu besar. Maksimal 5MB.' });
      }
      return res.status(400).json({ success: false, error: err.message });
    }

    try {
      const { order_id, bank_name, transfer_amount, transfer_date, notes } = req.body || {};

      if (!order_id || !bank_name || !transfer_amount || !transfer_date) {
        return res.status(400).json({ success: false, error: 'Order ID, bank, nominal, dan tanggal transfer wajib diisi.' });
      }

      const booking = await dbGet('SELECT order_id, total_price FROM bookings WHERE order_id = ?', [order_id.trim()]);
      if (!booking) {
        return res.status(404).json({ success: false, error: 'Order ID tidak ditemukan di sistem.' });
      }

      const proofUrl = req.file
        ? `${req.protocol}://${req.get('host')}/uploads/finance/${req.file.filename}`
        : null;

      const result = await dbRun(
        `INSERT INTO payment_reconciliations (order_id, bank_name, transfer_amount, transfer_date, proof_url, notes)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [order_id.trim(), bank_name, parseInt(transfer_amount), transfer_date, proofUrl, notes || null]
      );

      res.status(201).json({ success: true, message: 'Bukti transfer berhasil diunggah.', id: result.lastID });
    } catch (err) {
      console.error('POST /finance/reconciliations error:', err.message);
      res.status(500).json({ success: false, error: 'Gagal menyimpan data rekonsiliasi.' });
    }
  });
});

router.put('/reconciliations/:id/match', requirePermission('finance'), async (req, res) => {
  try {
    const recon = await dbGet('SELECT * FROM payment_reconciliations WHERE id = ?', [req.params.id]);
    if (!recon) return res.status(404).json({ success: false, error: 'Data rekonsiliasi tidak ditemukan.' });
    if (recon.status !== 'pending') {
      return res.status(400).json({ success: false, error: 'Hanya rekonsiliasi berstatus pending yang bisa dikonfirmasi.' });
    }

    // Ambil data booking + info pelanggan sekaligus (dipakai validasi & notif Telegram)
    const booking = await dbGet(
      `SELECT b.total_price, b.item_name,
              u.name as customer_name, u.phone as customer_phone
       FROM bookings b
       LEFT JOIN users u ON b.user_id = u.id
       WHERE b.order_id = ?`,
      [recon.order_id]
    );
    if (!booking) return res.status(404).json({ success: false, error: 'Booking terkait tidak ditemukan.' });

    if (recon.transfer_amount < booking.total_price) {
      return res.status(400).json({
        success: false,
        error: `Nominal transfer (Rp ${recon.transfer_amount.toLocaleString('id-ID')}) kurang dari total booking (Rp ${booking.total_price.toLocaleString('id-ID')}).`
      });
    }

    const now = new Date().toISOString();
    await dbRun(
      `UPDATE payment_reconciliations SET status = 'matched', reconciled_by = ?, reconciled_at = ? WHERE id = ?`,
      [req.user.id, now, req.params.id]
    );
    await dbRun(
      `UPDATE bookings SET payment_status = 'paid' WHERE order_id = ?`,
      [recon.order_id]
    );

    // ── TELEGRAM: Notifikasi pembayaran dikonfirmasi ───────────────────────────
    // Fire and forget — tidak blokir response
    notifyPaymentConfirmed(recon, booking, req.user.name)
      .catch((err) => console.error('[Telegram] payment notify error:', err.message));
    // ──────────────────────────────────────────────────────────────────────────

    res.json({ success: true, message: 'Pembayaran berhasil dikonfirmasi dan status booking diperbarui.' });
  } catch (err) {
    console.error('PUT /finance/reconciliations/:id/match error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengkonfirmasi rekonsiliasi.' });
  }
});

router.put('/reconciliations/:id/reject', requirePermission('finance'), async (req, res) => {
  try {
    const { notes } = req.body || {};
    const recon = await dbGet('SELECT id, status FROM payment_reconciliations WHERE id = ?', [req.params.id]);
    if (!recon) return res.status(404).json({ success: false, error: 'Data rekonsiliasi tidak ditemukan.' });
    if (recon.status !== 'pending') {
      return res.status(400).json({ success: false, error: 'Hanya rekonsiliasi berstatus pending yang bisa ditolak.' });
    }

    await dbRun(
      `UPDATE payment_reconciliations SET status = 'rejected', notes = ?, reconciled_by = ?, reconciled_at = ? WHERE id = ?`,
      [notes || null, req.user.id, new Date().toISOString(), req.params.id]
    );
    res.json({ success: true, message: 'Rekonsiliasi berhasil ditolak.' });
  } catch (err) {
    console.error('PUT /finance/reconciliations/:id/reject error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal menolak rekonsiliasi.' });
  }
});

// ==========================================
// PENGELUARAN OPERASIONAL (Akses: finance)
// ==========================================

router.get('/expenses', requirePermission('finance'), async (req, res) => {
  try {
    const { category, date_from, date_to, motor_unit_id } = req.query;
    const conditions = [];
    const params = [];

    if (category) { conditions.push('e.category = ?'); params.push(category); }
    if (date_from) { conditions.push('e.expense_date >= ?'); params.push(date_from); }
    if (date_to)   { conditions.push('e.expense_date <= ?'); params.push(date_to); }
    if (motor_unit_id) { conditions.push('e.motor_unit_id = ?'); params.push(motor_unit_id); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = await dbAll(
      `SELECT e.*,
              u.name as created_by_name,
              mu.plate_number
       FROM expenses e
       LEFT JOIN users u ON e.created_by = u.id
       LEFT JOIN motor_units mu ON e.motor_unit_id = mu.id
       ${where}
       ORDER BY e.expense_date DESC, e.created_at DESC`,
      params
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /finance/expenses error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil data pengeluaran.' });
  }
});

router.post('/expenses', requirePermission('finance'), (req, res) => {
  uploadFinance.single('receipt')(req, res, async (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ success: false, error: 'Ukuran file terlalu besar. Maksimal 5MB.' });
      }
      return res.status(400).json({ success: false, error: err.message });
    }

    try {
      const { category, amount, description, expense_date, motor_unit_id } = req.body || {};

      if (!category || !amount || !expense_date) {
        return res.status(400).json({ success: false, error: 'Kategori, nominal, dan tanggal wajib diisi.' });
      }

      const VALID_CATEGORIES = ['servis', 'bbm', 'sewa', 'gaji', 'marketing', 'lainnya'];
      if (!VALID_CATEGORIES.includes(category)) {
        return res.status(400).json({ success: false, error: 'Kategori tidak valid.' });
      }

      const parsedAmount = parseInt(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ success: false, error: 'Nominal harus berupa angka positif.' });
      }

      const receiptUrl = req.file
        ? `${req.protocol}://${req.get('host')}/uploads/finance/${req.file.filename}`
        : null;

      const result = await dbRun(
        `INSERT INTO expenses (category, motor_unit_id, amount, description, receipt_url, expense_date, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [category, motor_unit_id || null, parsedAmount, description || null, receiptUrl, expense_date, req.user.id]
      );
      res.status(201).json({ success: true, message: 'Pengeluaran berhasil dicatat.', id: result.lastID });
    } catch (err) {
      console.error('POST /finance/expenses error:', err.message);
      res.status(500).json({ success: false, error: 'Gagal menyimpan pengeluaran.' });
    }
  });
});

router.put('/expenses/:id', requirePermission('finance'), async (req, res) => {
  try {
    const { category, amount, description, expense_date, motor_unit_id } = req.body || {};
    if (!category || !amount || !expense_date) {
      return res.status(400).json({ success: false, error: 'Kategori, nominal, dan tanggal wajib diisi.' });
    }
    await dbRun(
      `UPDATE expenses SET category = ?, motor_unit_id = ?, amount = ?, description = ?, expense_date = ? WHERE id = ?`,
      [category, motor_unit_id || null, parseInt(amount), description || null, expense_date, req.params.id]
    );
    res.json({ success: true, message: 'Pengeluaran berhasil diperbarui.' });
  } catch (err) {
    console.error('PUT /finance/expenses/:id error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal memperbarui pengeluaran.' });
  }
});

router.delete('/expenses/:id', requirePermission('finance'), async (req, res) => {
  try {
    await dbRun('DELETE FROM expenses WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Pengeluaran berhasil dihapus.' });
  } catch (err) {
    console.error('DELETE /finance/expenses/:id error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal menghapus pengeluaran.' });
  }
});

// ==========================================
// LAPORAN KEUANGAN (Akses: finance)
// ==========================================

router.get('/summary', requirePermission('finance'), async (req, res) => {
  try {
    const now = new Date();
    const month = req.query.month
      ? String(req.query.month).padStart(2, '0')
      : String(now.getMonth() + 1).padStart(2, '0');
    const year = req.query.year || now.getFullYear();
    const datePrefix = `${year}-${month}`;

    const [revenueRow, expenseRow, reconPending] = await Promise.all([
      dbGet(
        `SELECT COALESCE(SUM(total_price), 0) as total, COUNT(*) as count
         FROM bookings
         WHERE status = 'completed' AND strftime('%Y-%m', created_at) = ?`,
        [datePrefix]
      ),
      dbGet(
        `SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
         FROM expenses
         WHERE strftime('%Y-%m', expense_date) = ?`,
        [datePrefix]
      ),
      dbGet(
        `SELECT COUNT(*) as count FROM payment_reconciliations WHERE status = 'pending'`,
        []
      )
    ]);

    const grossRevenue = revenueRow.total || 0;
    const totalExpense = expenseRow.total || 0;

    res.json({
      success: true,
      data: {
        period: `${month}/${year}`,
        gross_revenue: grossRevenue,
        total_expense: totalExpense,
        net_profit: grossRevenue - totalExpense,
        booking_count: revenueRow.count || 0,
        expense_count: expenseRow.count || 0,
        pending_reconciliation: reconPending.count || 0
      }
    });
  } catch (err) {
    console.error('GET /finance/summary error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil ringkasan keuangan.' });
  }
});

router.get('/revenue-chart', requirePermission('finance'), async (req, res) => {
  try {
    const now = new Date();
    const month = req.query.month
      ? String(req.query.month).padStart(2, '0')
      : String(now.getMonth() + 1).padStart(2, '0');
    const year = req.query.year || now.getFullYear();
    const datePrefix = `${year}-${month}`;

    const rows = await dbAll(
      `SELECT strftime('%Y-%m-%d', created_at) as date,
              COALESCE(SUM(total_price), 0) as revenue,
              COUNT(*) as bookings_count
       FROM bookings
       WHERE status = 'completed' AND strftime('%Y-%m', created_at) = ?
       GROUP BY strftime('%Y-%m-%d', created_at)
       ORDER BY date ASC`,
      [datePrefix]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /finance/revenue-chart error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil data chart.' });
  }
});

router.get('/expense-breakdown', requirePermission('finance'), async (req, res) => {
  try {
    const now = new Date();
    const month = req.query.month
      ? String(req.query.month).padStart(2, '0')
      : String(now.getMonth() + 1).padStart(2, '0');
    const year = req.query.year || now.getFullYear();
    const datePrefix = `${year}-${month}`;

    const rows = await dbAll(
      `SELECT category,
              COALESCE(SUM(amount), 0) as total,
              COUNT(*) as count
       FROM expenses
       WHERE strftime('%Y-%m', expense_date) = ?
       GROUP BY category
       ORDER BY total DESC`,
      [datePrefix]
    );

    const grandTotal = rows.reduce((acc, r) => acc + r.total, 0);
    const data = rows.map(r => ({
      ...r,
      percentage: grandTotal > 0 ? Math.round((r.total / grandTotal) * 100) : 0
    }));

    res.json({ success: true, data, grand_total: grandTotal });
  } catch (err) {
    console.error('GET /finance/expense-breakdown error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil breakdown pengeluaran.' });
  }
});

// ==========================================
// VENDOR PAYOUTS (Akses: finance)
// ==========================================

router.get('/vendor-payouts', requirePermission('finance'), async (req, res) => {
  try {
    const { status } = req.query;
    const params = [];
    let whereClause = '';

    if (status && status !== 'all') {
      whereClause = 'WHERE vp.status = ?';
      params.push(status);
    }

    const rows = await dbAll(
      `SELECT vp.*,
              u.name as vendor_name,
              u.bank_name, u.bank_account
       FROM vendor_payouts vp
       LEFT JOIN users u ON vp.vendor_user_id = u.id
       ${whereClause}
       ORDER BY vp.created_at DESC`,
      params
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /finance/vendor-payouts error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil data payout vendor.' });
  }
});

router.post('/vendor-payouts/generate', requirePermission('finance'), async (req, res) => {
  try {
    const { period_start, period_end } = req.body || {};
    if (!period_start || !period_end) {
      return res.status(400).json({ success: false, error: 'Periode awal dan akhir wajib diisi.' });
    }

    const vendorRevenues = await dbAll(
      `SELECT m.vendor_user_id, m.vendor_rate,
              COALESCE(SUM(b.total_price), 0) as gross_revenue,
              COUNT(b.order_id) as booking_count
       FROM bookings b
       JOIN motors m ON b.item_name = m.name
       WHERE b.status = 'completed'
         AND m.vendor_user_id IS NOT NULL
         AND m.vendor_rate > 0
         AND date(b.created_at) >= date(?)
         AND date(b.created_at) <= date(?)
       GROUP BY m.vendor_user_id, m.vendor_rate`,
      [period_start, period_end]
    );

    if (!vendorRevenues.length) {
      return res.json({
        success: true,
        message: 'Tidak ada vendor dengan booking selesai di periode ini.',
        generated: 0
      });
    }

    let generated = 0;
    for (const v of vendorRevenues) {
      const commissionAmount = Math.floor(v.gross_revenue * v.vendor_rate);
      await dbRun(
        `INSERT INTO vendor_payouts (vendor_user_id, period_start, period_end, gross_revenue, commission_rate, commission_amount)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [v.vendor_user_id, period_start, period_end, v.gross_revenue, v.vendor_rate, commissionAmount]
      );
      generated++;
    }

    res.status(201).json({
      success: true,
      message: `${generated} payout vendor berhasil di-generate.`,
      generated
    });
  } catch (err) {
    console.error('POST /finance/vendor-payouts/generate error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal generate payout vendor.' });
  }
});

router.put('/vendor-payouts/:id/approve', requirePermission('finance'), async (req, res) => {
  try {
    const payout = await dbGet('SELECT id, status FROM vendor_payouts WHERE id = ?', [req.params.id]);
    if (!payout) return res.status(404).json({ success: false, error: 'Payout tidak ditemukan.' });
    if (payout.status !== 'pending') {
      return res.status(400).json({ success: false, error: 'Hanya payout berstatus pending yang bisa di-approve.' });
    }
    await dbRun(
      `UPDATE vendor_payouts SET status = 'approved', approved_by = ?, approved_at = ? WHERE id = ?`,
      [req.user.id, new Date().toISOString(), req.params.id]
    );
    res.json({ success: true, message: 'Payout berhasil di-approve.' });
  } catch (err) {
    console.error('PUT /finance/vendor-payouts/:id/approve error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal approve payout.' });
  }
});

router.put('/vendor-payouts/:id/pay', requirePermission('finance'), (req, res) => {
  uploadFinance.single('transfer_proof')(req, res, async (err) => {
    if (err) return res.status(400).json({ success: false, error: err.message });

    try {
      const payout = await dbGet('SELECT id, status FROM vendor_payouts WHERE id = ?', [req.params.id]);
      if (!payout) return res.status(404).json({ success: false, error: 'Payout tidak ditemukan.' });
      if (payout.status !== 'approved') {
        return res.status(400).json({ success: false, error: 'Payout harus di-approve dulu sebelum bisa ditandai paid.' });
      }

      const proofUrl = req.file
        ? `${req.protocol}://${req.get('host')}/uploads/finance/${req.file.filename}`
        : null;

      await dbRun(
        `UPDATE vendor_payouts SET status = 'paid', transfer_proof = ? WHERE id = ?`,
        [proofUrl, req.params.id]
      );
      res.json({ success: true, message: 'Payout berhasil ditandai sudah dibayar.' });
    } catch (err) {
      console.error('PUT /finance/vendor-payouts/:id/pay error:', err.message);
      res.status(500).json({ success: false, error: 'Gagal memperbarui status payout.' });
    }
  });
});

module.exports = router;
