'use strict';

const express = require('express');
const router = express.Router();
const db = require('../db');

const dbGet = (sql, params = []) =>
  new Promise((resolve, reject) => db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row))));

const dbAll = (sql, params = []) =>
  new Promise((resolve, reject) => db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || []))));

// GET /api/tickets/products?city=jogja&category=attraction
router.get('/products', async (req, res) => {
  try {
    const city = String(req.query.city || '').trim().toLowerCase();
    const category = String(req.query.category || '').trim().toLowerCase();

    const where = [`p.is_active = 1`, `v.is_active = 1`];
    const params = [];
    if (city) { where.push(`lower(COALESCE(p.city,'')) = ?`); params.push(city); }
    if (category) { where.push(`lower(COALESCE(p.category,'')) = ?`); params.push(category); }

    const rows = await dbAll(
      `
      SELECT p.id, p.slug, p.title, p.category, p.city, p.venue_name, p.address, p.maps_url,
             p.cover_image_url, p.vendor_id,
             MIN(v.price) as min_price,
             COUNT(v.id) as variant_count
      FROM ticket_products p
      JOIN ticket_variants v ON v.product_id = p.id
      WHERE ${where.join(' AND ')}
      GROUP BY p.id
      ORDER BY p.city ASC, p.id DESC
      `,
      params
    );

    res.json({ success: true, data: rows });
  } catch (e) {
    console.error('GET /tickets/products error:', e.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil data tiket.' });
  }
});

// GET /api/tickets/products/:slug
router.get('/products/:slug', async (req, res) => {
  try {
    const slug = String(req.params.slug || '').trim();
    if (!slug) return res.status(400).json({ success: false, error: 'Slug tidak valid.' });

    const product = await dbGet(
      `
      SELECT id, slug, title, category, city, venue_name, address, maps_url, vendor_id,
             cover_image_url, description_html, terms_html, is_active
      FROM ticket_products
      WHERE slug = ?
      LIMIT 1
      `,
      [slug]
    ).catch(() => null);

    if (!product || Number(product.is_active) !== 1) {
      return res.status(404).json({ success: false, error: 'Tiket tidak ditemukan.' });
    }

    const variants = await dbAll(
      `
      SELECT id, product_id, name, price, quota_per_day, is_active
      FROM ticket_variants
      WHERE product_id = ? AND is_active = 1
      ORDER BY price ASC, id ASC
      `,
      [product.id]
    );

    res.json({ success: true, data: { ...product, variants } });
  } catch (e) {
    console.error('GET /tickets/products/:slug error:', e.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil detail tiket.' });
  }
});

module.exports = router;

