const express = require('express');
const db = require('../db');
const { verifyAdmin, requirePermission } = require('../middlewares/authMiddleware');

const router = express.Router();

const dbGet = (sql, params = []) =>
  new Promise((resolve, reject) => db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row))));
const dbAll = (sql, params = []) =>
  new Promise((resolve, reject) => db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || []))));
const dbRun = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      return resolve({ lastID: this.lastID, changes: this.changes });
    })
  );

const normalizeType = (value) => String(value || '').trim().toLowerCase();
const normalizeCity = (value) => String(value || '').trim().toLowerCase();

const ALLOWED_TYPES = new Set(['attraction', 'charging']);
const ALLOWED_CITIES = new Set(['jogja', 'solo']);

const isValidHttpUrl = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return true; // optional
  try {
    const u = new URL(raw);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
};

const pickBody = (body = {}) => {
  const place_type = normalizeType(body.place_type);
  const city = normalizeCity(body.city);
  const name = String(body.name || '').trim();
  const address = String(body.address || '').trim() || null;
  const maps_url = String(body.maps_url || '').trim() || null;
  const description = String(body.description || '').trim() || null;
  const is_active =
    body.is_active === 0 || body.is_active === '0' || body.is_active === false || body.is_active === 'false'
      ? 0
      : 1;
  const sort_order_raw = Number(body.sort_order);
  const sort_order = Number.isFinite(sort_order_raw) ? Math.trunc(sort_order_raw) : 0;

  return { place_type, city, name, address, maps_url, description, is_active, sort_order };
};

router.use(verifyAdmin, requirePermission('content'));

router.get('/', async (req, res) => {
  try {
    const type = normalizeType(req.query.type);
    const city = normalizeCity(req.query.city);
    const active = String(req.query.active || '').trim();

    if (type && !ALLOWED_TYPES.has(type)) {
      return res.status(400).json({ success: false, error: 'Query "type" tidak valid.' });
    }
    if (city && !ALLOWED_CITIES.has(city)) {
      return res.status(400).json({ success: false, error: 'Query "city" tidak valid.' });
    }

    const where = ['1=1'];
    const params = [];

    if (type) {
      where.push('place_type = ?');
      params.push(type);
    }
    if (city) {
      where.push('city = ?');
      params.push(city);
    }
    if (active === '1' || active === '0') {
      where.push('is_active = ?');
      params.push(Number(active));
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
        sort_order,
        created_at,
        updated_at
      FROM places
      WHERE ${where.join(' AND ')}
      ORDER BY place_type ASC, city ASC, sort_order ASC, id ASC
      `,
      params
    );

    return res.json({ success: true, data: rows });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message || 'Gagal memuat places.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const payload = pickBody(req.body);
    if (!payload.place_type || !ALLOWED_TYPES.has(payload.place_type)) {
      return res.status(400).json({ success: false, error: 'place_type wajib: attraction | charging' });
    }
    if (!payload.city || !ALLOWED_CITIES.has(payload.city)) {
      return res.status(400).json({ success: false, error: 'city wajib: jogja | solo' });
    }
    if (!payload.name) {
      return res.status(400).json({ success: false, error: 'name wajib diisi.' });
    }
    if (!isValidHttpUrl(payload.maps_url)) {
      return res.status(400).json({ success: false, error: 'maps_url harus URL http(s).' });
    }

    const now = new Date().toISOString();

    const result = await dbRun(
      `
      INSERT INTO places
        (place_type, city, name, address, maps_url, description, is_active, sort_order, created_at, updated_at, created_by, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        payload.place_type,
        payload.city,
        payload.name,
        payload.address,
        payload.maps_url,
        payload.description,
        payload.is_active,
        payload.sort_order,
        now,
        now,
        req.user?.id || null,
        req.user?.id || null,
      ]
    );

    const row = await dbGet(`SELECT * FROM places WHERE id = ?`, [result.lastID]);
    return res.status(201).json({ success: true, data: row });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message || 'Gagal membuat place.' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ success: false, error: 'ID tidak valid.' });
    }

    const existing = await dbGet(`SELECT id FROM places WHERE id = ?`, [id]);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Place tidak ditemukan.' });
    }

    const payload = pickBody(req.body);
    if (!payload.place_type || !ALLOWED_TYPES.has(payload.place_type)) {
      return res.status(400).json({ success: false, error: 'place_type wajib: attraction | charging' });
    }
    if (!payload.city || !ALLOWED_CITIES.has(payload.city)) {
      return res.status(400).json({ success: false, error: 'city wajib: jogja | solo' });
    }
    if (!payload.name) {
      return res.status(400).json({ success: false, error: 'name wajib diisi.' });
    }
    if (!isValidHttpUrl(payload.maps_url)) {
      return res.status(400).json({ success: false, error: 'maps_url harus URL http(s).' });
    }

    const now = new Date().toISOString();

    await dbRun(
      `
      UPDATE places
      SET
        place_type = ?,
        city = ?,
        name = ?,
        address = ?,
        maps_url = ?,
        description = ?,
        is_active = ?,
        sort_order = ?,
        updated_at = ?,
        updated_by = ?
      WHERE id = ?
      `,
      [
        payload.place_type,
        payload.city,
        payload.name,
        payload.address,
        payload.maps_url,
        payload.description,
        payload.is_active,
        payload.sort_order,
        now,
        req.user?.id || null,
        id,
      ]
    );

    const row = await dbGet(`SELECT * FROM places WHERE id = ?`, [id]);
    return res.json({ success: true, data: row });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message || 'Gagal update place.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ success: false, error: 'ID tidak valid.' });
    }
    const existing = await dbGet(`SELECT id FROM places WHERE id = ?`, [id]);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Place tidak ditemukan.' });
    }

    await dbRun(`DELETE FROM places WHERE id = ?`, [id]);
    return res.json({ success: true, message: 'Place dihapus.' });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message || 'Gagal hapus place.' });
  }
});

module.exports = router;

