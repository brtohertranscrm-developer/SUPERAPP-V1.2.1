'use strict';

const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyUser } = require('../middlewares/authMiddleware');
const { lookupVoucherByCode, redeemVoucherByCode } = require('../utils/ticketing');

router.use(verifyUser);

const canVendor = (role) => {
  const r = String(role || '').toLowerCase();
  return r === 'vendor' || r === 'admin' || r === 'superadmin';
};

const resolveVendorId = (req) => {
  const role = String(req.user?.role || '').toLowerCase();
  if (role === 'vendor') return String(req.user.id);
  // admin/superadmin can optionally scope by vendor_id for debugging
  const vendorId = req.query.vendor_id || req.body?.vendor_id || null;
  return vendorId ? String(vendorId) : null;
};

const dbGet = (sql, params = []) =>
  new Promise((resolve, reject) => db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row))));

const dbAll = (sql, params = []) =>
  new Promise((resolve, reject) => db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || []))));

const clampYmd = (v) => {
  const s = String(v || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return s;
};

// GET /api/vendor/tickets/summary?start=YYYY-MM-DD&end=YYYY-MM-DD
router.get('/summary', async (req, res) => {
  try {
    if (!canVendor(req.user?.role)) {
      return res.status(403).json({ success: false, error: 'Akses ditolak.' });
    }
    const vendorId = resolveVendorId(req);
    if (!vendorId) return res.status(400).json({ success: false, error: 'vendor_id wajib.' });

    const start = clampYmd(req.query.start) || (await dbGet(`SELECT date('now','localtime') as d`))?.d;
    const end = clampYmd(req.query.end) || start;

    const counts = await dbGet(
      `
      SELECT
        COUNT(*) as sold_count,
        SUM(CASE WHEN tv.status = 'used' THEN 1 ELSE 0 END) as redeemed_count,
        SUM(CASE WHEN tv.status = 'active' THEN 1 ELSE 0 END) as active_count,
        SUM(COALESCE(v.price, 0)) as sold_amount,
        SUM(CASE WHEN tv.status = 'used' THEN COALESCE(v.price, 0) ELSE 0 END) as redeemed_amount
      FROM ticket_vouchers tv
      JOIN ticket_variants v ON v.id = tv.variant_id
      WHERE tv.vendor_id = ?
        AND date(tv.visit_date) >= date(?)
        AND date(tv.visit_date) <= date(?)
      `,
      [vendorId, start, end]
    ).catch(() => null);

    const recent = await dbAll(
      `
      SELECT tv.voucher_code, tv.order_id, tv.visit_date, tv.status, tv.used_at,
             p.title as product_title, p.city as product_city,
             v.name as variant_name, v.price as variant_price,
             r.redeemed_at, r.vendor_user_id, r.notes
      FROM ticket_redemptions r
      JOIN ticket_vouchers tv ON tv.id = r.voucher_id
      JOIN ticket_products p ON p.id = tv.product_id
      JOIN ticket_variants v ON v.id = tv.variant_id
      WHERE tv.vendor_id = ?
        AND date(tv.visit_date) >= date(?)
        AND date(tv.visit_date) <= date(?)
      ORDER BY datetime(r.redeemed_at) DESC
      LIMIT 50
      `,
      [vendorId, start, end]
    );

    res.json({
      success: true,
      data: {
        start,
        end,
        sold_count: Number(counts?.sold_count) || 0,
        redeemed_count: Number(counts?.redeemed_count) || 0,
        active_count: Number(counts?.active_count) || 0,
        sold_amount: Number(counts?.sold_amount) || 0,
        redeemed_amount: Number(counts?.redeemed_amount) || 0,
        recent_redemptions: recent,
      },
    });
  } catch (e) {
    console.error('GET /vendor/tickets/summary error:', e.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil summary.' });
  }
});

// GET /api/vendor/tickets/vouchers?start=YYYY-MM-DD&end=YYYY-MM-DD&status=active|used
router.get('/vouchers', async (req, res) => {
  try {
    if (!canVendor(req.user?.role)) {
      return res.status(403).json({ success: false, error: 'Akses ditolak.' });
    }
    const vendorId = resolveVendorId(req);
    if (!vendorId) return res.status(400).json({ success: false, error: 'vendor_id wajib.' });

    const start = clampYmd(req.query.start) || (await dbGet(`SELECT date('now','localtime') as d`))?.d;
    const end = clampYmd(req.query.end) || start;
    const status = String(req.query.status || '').trim().toLowerCase();
    const where = [
      `tv.vendor_id = ?`,
      `date(tv.visit_date) >= date(?)`,
      `date(tv.visit_date) <= date(?)`,
    ];
    const params = [vendorId, start, end];
    if (status === 'active' || status === 'used') {
      where.push(`tv.status = ?`);
      params.push(status);
    }

    const rows = await dbAll(
      `
      SELECT tv.voucher_code, tv.order_id, tv.user_id, tv.visit_date, tv.status, tv.created_at, tv.used_at,
             p.title as product_title, p.city as product_city,
             v.name as variant_name, v.price as variant_price
      FROM ticket_vouchers tv
      JOIN ticket_products p ON p.id = tv.product_id
      JOIN ticket_variants v ON v.id = tv.variant_id
      WHERE ${where.join(' AND ')}
      ORDER BY tv.visit_date DESC, tv.id DESC
      LIMIT 200
      `,
      params
    );

    res.json({ success: true, data: { start, end, rows } });
  } catch (e) {
    console.error('GET /vendor/tickets/vouchers error:', e.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil voucher list.' });
  }
});

router.get('/vouchers/:code', async (req, res) => {
  try {
    if (!canVendor(req.user?.role)) {
      return res.status(403).json({ success: false, error: 'Akses ditolak.' });
    }

    const vendorId = resolveVendorId(req);
    const code = String(req.params.code || '').trim();
    const v = await lookupVoucherByCode({ code, vendorId });
    if (!v) return res.status(404).json({ success: false, error: 'Voucher tidak ditemukan.' });
    res.json({ success: true, data: v });
  } catch (e) {
    console.error('GET /vendor/tickets/vouchers/:code error:', e.message);
    res.status(500).json({ success: false, error: 'Gagal mencari voucher.' });
  }
});

router.post('/vouchers/:code/redeem', async (req, res) => {
  try {
    if (!canVendor(req.user?.role)) {
      return res.status(403).json({ success: false, error: 'Akses ditolak.' });
    }

    const vendorId = resolveVendorId(req);
    const code = String(req.params.code || '').trim();
    const notes = req.body?.notes || null;
    const r = await redeemVoucherByCode({ code, vendorUserId: req.user.id, vendorId, notes });
    if (!r.ok) return res.status(400).json({ success: false, error: r.error });
    res.json({ success: true, data: r.voucher });
  } catch (e) {
    console.error('POST /vendor/tickets/vouchers/:code/redeem error:', e.message);
    res.status(500).json({ success: false, error: 'Gagal redeem voucher.' });
  }
});

module.exports = router;
