'use strict';

const express = require('express');
const router = express.Router();
const { verifyUser } = require('../middlewares/authMiddleware');
const { lookupVoucherByCode } = require('../utils/ticketing');
const db = require('../db');

const dbAll = (sql, params = []) =>
  new Promise((resolve, reject) => db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || []))));

router.use(verifyUser);

// GET /api/users/tickets
router.get('/users/tickets', async (req, res) => {
  try {
    const rows = await dbAll(
      `
      SELECT tv.voucher_code, tv.order_id, tv.visit_date, tv.status, tv.created_at, tv.used_at,
             p.slug as product_slug, p.title as product_title, p.city as product_city, p.category as product_category,
             p.venue_name, p.address, p.maps_url, p.cover_image_url,
             v.name as variant_name, v.price as variant_price
      FROM ticket_vouchers tv
      JOIN ticket_products p ON p.id = tv.product_id
      JOIN ticket_variants v ON v.id = tv.variant_id
      WHERE tv.user_id = ?
      ORDER BY tv.visit_date DESC, tv.id DESC
      `,
      [req.user.id]
    );

    res.json({ success: true, data: rows });
  } catch (e) {
    console.error('GET /users/tickets error:', e.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil tiket.' });
  }
});

// GET /api/users/tickets/:code
router.get('/users/tickets/:code', async (req, res) => {
  try {
    const code = String(req.params.code || '').trim();
    const v = await lookupVoucherByCode({ code });
    if (!v || v.user_id !== req.user.id) {
      return res.status(404).json({ success: false, error: 'Tiket tidak ditemukan.' });
    }
    res.json({ success: true, data: v });
  } catch (e) {
    console.error('GET /users/tickets/:code error:', e.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil detail tiket.' });
  }
});

module.exports = router;

