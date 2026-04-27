const express = require('express');
const db = require('../db');

const router = express.Router();

const dbGet = (sql, params = []) =>
  new Promise((resolve, reject) => db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row))));

const safeJson = (value, fallback) => {
  try {
    if (value == null) return fallback;
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

// Public: fetch SEO page by slug (supports slashes via wildcard).
// Example: GET /api/pages/jogja/sewa-motor
router.get('/pages/*', async (req, res) => {
  const slug = String(req.params[0] || '').replace(/^\/+/, '').trim();
  if (!slug) return res.status(400).json({ success: false, error: 'Slug wajib diisi.' });

  try {
    const row = await dbGet(
      `SELECT id, slug, city, service, title, meta_description, h1, sections_json, faqs_json, updated_at
       FROM seo_pages
       WHERE slug = ? AND is_published = 1
       LIMIT 1`,
      [slug]
    );

    if (!row) return res.status(404).json({ success: false, error: 'Halaman tidak ditemukan.' });

    return res.json({
      success: true,
      data: {
        id: row.id,
        slug: row.slug,
        city: row.city,
        service: row.service,
        title: row.title,
        meta_description: row.meta_description,
        h1: row.h1,
        sections: safeJson(row.sections_json, []),
        faqs: safeJson(row.faqs_json, []),
        updated_at: row.updated_at,
      },
    });
  } catch (err) {
    console.error('GET /pages/* error:', err.message);
    return res.status(500).json({ success: false, error: 'Gagal mengambil halaman.' });
  }
});

module.exports = router;

