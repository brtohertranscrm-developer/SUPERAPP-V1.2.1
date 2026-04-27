const express = require('express');
const db = require('../db');

const router = express.Router();

const dbAll = (sql, params = []) =>
  new Promise((resolve, reject) => db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || []))));

const normalizeType = (value) => String(value || '').trim().toLowerCase();
const normalizeCity = (value) => String(value || '').trim().toLowerCase();

const ALLOWED_TYPES = new Set(['attraction', 'charging']);
const ALLOWED_CITIES = new Set(['jogja', 'solo']);

router.get('/', async (req, res) => {
  try {
    const type = normalizeType(req.query.type);
    const city = normalizeCity(req.query.city);

    if (type && !ALLOWED_TYPES.has(type)) {
      return res.status(400).json({ success: false, error: 'Query "type" tidak valid.' });
    }
    if (city && !ALLOWED_CITIES.has(city)) {
      return res.status(400).json({ success: false, error: 'Query "city" tidak valid.' });
    }

    const where = ['is_active = 1'];
    const params = [];

    if (type) {
      where.push('place_type = ?');
      params.push(type);
    }
    if (city) {
      where.push('city = ?');
      params.push(city);
    }

    const rows = await dbAll(
      `
      SELECT
        id,
        place_type,
        city,
        name,
        address,
        maps_url,
        description,
        is_active,
        sort_order
      FROM places
      WHERE ${where.join(' AND ')}
      ORDER BY sort_order ASC, id ASC
      `,
      params
    );

    return res.json({ success: true, data: rows });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message || 'Gagal memuat data places.' });
  }
});

module.exports = router;

