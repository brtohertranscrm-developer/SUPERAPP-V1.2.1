'use strict';

const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyAdmin, requirePermission } = require('../middlewares/authMiddleware');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const ImageKit = require('imagekit');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

router.use(verifyAdmin);
router.use(requirePermission('tickets'));

const dbGet = (sql, params = []) =>
  new Promise((resolve, reject) => db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row))));

const dbAll = (sql, params = []) =>
  new Promise((resolve, reject) => db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || []))));

const dbRun = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.run(sql, params, function (err) {
      err ? reject(err) : resolve({ lastID: this.lastID, changes: this.changes });
    })
  );

const sanitize = (v, max = 500) =>
  typeof v === 'string' ? v.trim().slice(0, max) : '';

const sanitizeHtmlLoose = (v, max = 20000) =>
  typeof v === 'string' ? v.trim().slice(0, max) : '';

const imagekit = (
  process.env.IMAGEKIT_PUBLIC_KEY &&
  process.env.IMAGEKIT_PRIVATE_KEY &&
  process.env.IMAGEKIT_URL_ENDPOINT
) ? new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
}) : null;

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
const getSafeExtension = (originalname) => {
  const ext = path.extname(originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) return null;
  return ext;
};

const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    const mimeOk = ALLOWED_IMAGE_TYPES.includes(file.mimetype);
    const extOk = getSafeExtension(file.originalname) !== null;
    if (mimeOk && extOk) return cb(null, true);
    return cb(new Error('Tipe file tidak diizinkan. Gunakan JPG, PNG, WebP, atau GIF.'));
  },
});

const ensureUploadsDir = () => {
  try {
    const dir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  } catch {}
};

const saveBufferToLocalUploads = ({ buffer, filename }) => {
  ensureUploadsDir();
  const fullPath = path.join(__dirname, '..', 'uploads', filename);
  fs.writeFileSync(fullPath, buffer);
  return `/uploads/${filename}`;
};

const uploadBufferToStorage = async ({ buffer, filename, folder }) => {
  if (imagekit) {
    const uploaded = await imagekit.upload({
      file: Buffer.from(buffer).toString('base64'),
      fileName: filename,
      folder,
      useUniqueFileName: true,
    });
    return { provider: 'imagekit', url: uploaded.url };
  }
  const url = saveBufferToLocalUploads({ buffer, filename });
  return { provider: 'local', url };
};

// POST /api/admin/tickets/uploads/cover
router.post('/uploads/cover', (req, res) => {
  memoryUpload.single('file')(req, res, async (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ success: false, error: 'Ukuran file terlalu besar. Maks 5MB.' });
      }
      return res.status(400).json({ success: false, error: err.message });
    }
    try {
      if (!req.file?.buffer) return res.status(400).json({ success: false, error: 'File tidak ditemukan.' });
      const ext = getSafeExtension(req.file.originalname);
      if (!ext) return res.status(400).json({ success: false, error: 'Ekstensi file tidak valid.' });
      const filename = `ticket-cover-${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
      const uploaded = await uploadBufferToStorage({
        buffer: req.file.buffer,
        filename,
        folder: '/tickets/covers',
      });
      res.status(201).json({ success: true, url: uploaded.url, provider: uploaded.provider });
    } catch (e) {
      console.error('POST /admin/tickets/uploads/cover error:', e.message);
      res.status(500).json({ success: false, error: 'Gagal upload cover.' });
    }
  });
});

// GET /api/admin/tickets/vendors
router.get('/vendors', async (req, res) => {
  try {
    const rows = await dbAll(
      `SELECT id, vendor_name, name, email, phone, role
       FROM users
       WHERE role = 'vendor'
       ORDER BY datetime(join_date) DESC`
    );
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error('GET /admin/tickets/vendors error:', e.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil data vendor.' });
  }
});

// POST /api/admin/tickets/vendors — create vendor user
router.post('/vendors', async (req, res) => {
  try {
    const raw = req.body || {};
    const vendor_name = sanitize(raw.vendor_name, 180);
    const pic_name = sanitize(raw.pic_name, 140);
    const email = sanitize(raw.email, 180).toLowerCase();
    const phone = sanitize(raw.phone, 40) || '080000000000';
    const password = typeof raw.password === 'string' ? raw.password : '';

    if (!vendor_name) return res.status(400).json({ success: false, error: 'Nama vendor wajib.' });
    if (!pic_name) return res.status(400).json({ success: false, error: 'Nama PIC wajib.' });
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      return res.status(400).json({ success: false, error: 'Email tidak valid.' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password minimal 6 karakter.' });
    }

    const exists = await dbGet(`SELECT id FROM users WHERE email = ? LIMIT 1`, [email]).catch(() => null);
    if (exists) return res.status(409).json({ success: false, error: 'Email sudah dipakai.' });

    const id = crypto.randomUUID();
    const hashed = await bcrypt.hash(password, 12);
    const join_date = new Date().toISOString();

    await dbRun(
      `
      INSERT INTO users
        (id, vendor_name, name, email, password, phone, ktp_id, role, permissions, kyc_status, miles, location, join_date, email_verified)
      VALUES
        (?, ?, ?, ?, ?, ?, NULL, 'vendor', '[]', 'unverified', 0, 'Lainnya', ?, 1)
      `,
      [id, vendor_name, pic_name, email, hashed, phone, join_date]
    );

    res.status(201).json({ success: true, id });
  } catch (e) {
    console.error('POST /admin/tickets/vendors error:', e.message);
    res.status(500).json({ success: false, error: 'Gagal membuat vendor.' });
  }
});

// GET /api/admin/tickets/products
router.get('/products', async (req, res) => {
  try {
    const rows = await dbAll(
      `
      SELECT p.*,
             (SELECT COUNT(*) FROM ticket_variants v WHERE v.product_id = p.id) as variant_count,
             (SELECT MIN(price) FROM ticket_variants v2 WHERE v2.product_id = p.id AND v2.is_active = 1) as min_price
      FROM ticket_products p
      ORDER BY p.is_active DESC, p.id DESC
      `
    );
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error('GET /admin/tickets/products error:', e.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil produk tiket.' });
  }
});

// POST /api/admin/tickets/products
router.post('/products', async (req, res) => {
  try {
    const raw = req.body || {};
    const slug = sanitize(raw.slug, 120).toLowerCase();
    const title = sanitize(raw.title, 180);
    const category = sanitize(raw.category, 60).toLowerCase() || 'attraction';
    const city = sanitize(raw.city, 60).toLowerCase() || 'jogja';
    const venue_name = sanitize(raw.venue_name, 180) || null;
    const address = sanitize(raw.address, 300) || null;
    const maps_url = sanitize(raw.maps_url, 400) || null;
    const vendor_id = raw.vendor_id ? sanitize(String(raw.vendor_id), 80) : null;
    const cover_image_url = sanitize(raw.cover_image_url, 400) || null;
    const description_html = sanitizeHtmlLoose(raw.description_html, 30000) || null;
    const terms_html = sanitizeHtmlLoose(raw.terms_html, 30000) || null;
    const is_active = raw.is_active === 0 || raw.is_active === '0' ? 0 : 1;

    if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return res.status(400).json({ success: false, error: 'Slug wajib (lowercase, dash). Contoh: tiket-prambanan' });
    }
    if (!title) {
      return res.status(400).json({ success: false, error: 'Judul wajib diisi.' });
    }

    if (vendor_id) {
      const v = await dbGet(`SELECT id FROM users WHERE id = ? AND role = 'vendor' LIMIT 1`, [vendor_id]).catch(() => null);
      if (!v) return res.status(400).json({ success: false, error: 'Vendor tidak valid.' });
    }

    const r = await dbRun(
      `
      INSERT INTO ticket_products
        (slug, title, category, city, venue_name, address, maps_url, vendor_id,
         cover_image_url, description_html, terms_html, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `,
      [slug, title, category, city, venue_name, address, maps_url, vendor_id, cover_image_url, description_html, terms_html, is_active]
    );

    res.status(201).json({ success: true, id: r.lastID });
  } catch (e) {
    const msg = String(e?.message || '');
    if (msg.includes('UNIQUE') && msg.includes('slug')) {
      return res.status(409).json({ success: false, error: 'Slug sudah dipakai.' });
    }
    console.error('POST /admin/tickets/products error:', e.message);
    res.status(500).json({ success: false, error: 'Gagal membuat produk tiket.' });
  }
});

// PUT /api/admin/tickets/products/:id
router.put('/products/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ success: false, error: 'ID tidak valid.' });

    const raw = req.body || {};
    const slug = sanitize(raw.slug, 120).toLowerCase();
    const title = sanitize(raw.title, 180);
    const category = sanitize(raw.category, 60).toLowerCase() || 'attraction';
    const city = sanitize(raw.city, 60).toLowerCase() || 'jogja';
    const venue_name = sanitize(raw.venue_name, 180) || null;
    const address = sanitize(raw.address, 300) || null;
    const maps_url = sanitize(raw.maps_url, 400) || null;
    const vendor_id = raw.vendor_id ? sanitize(String(raw.vendor_id), 80) : null;
    const cover_image_url = sanitize(raw.cover_image_url, 400) || null;
    const description_html = sanitizeHtmlLoose(raw.description_html, 30000) || null;
    const terms_html = sanitizeHtmlLoose(raw.terms_html, 30000) || null;
    const is_active = raw.is_active === 0 || raw.is_active === '0' ? 0 : 1;

    if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return res.status(400).json({ success: false, error: 'Slug tidak valid.' });
    }
    if (!title) {
      return res.status(400).json({ success: false, error: 'Judul wajib diisi.' });
    }

    if (vendor_id) {
      const v = await dbGet(`SELECT id FROM users WHERE id = ? AND role = 'vendor' LIMIT 1`, [vendor_id]).catch(() => null);
      if (!v) return res.status(400).json({ success: false, error: 'Vendor tidak valid.' });
    }

    const r = await dbRun(
      `
      UPDATE ticket_products
      SET slug = ?, title = ?, category = ?, city = ?, venue_name = ?, address = ?, maps_url = ?, vendor_id = ?,
          cover_image_url = ?, description_html = ?, terms_html = ?, is_active = ?, updated_at = datetime('now')
      WHERE id = ?
      `,
      [slug, title, category, city, venue_name, address, maps_url, vendor_id, cover_image_url, description_html, terms_html, is_active, id]
    );

    if (!r || r.changes === 0) return res.status(404).json({ success: false, error: 'Produk tidak ditemukan.' });
    res.json({ success: true });
  } catch (e) {
    const msg = String(e?.message || '');
    if (msg.includes('UNIQUE') && msg.includes('slug')) {
      return res.status(409).json({ success: false, error: 'Slug sudah dipakai.' });
    }
    console.error('PUT /admin/tickets/products/:id error:', e.message);
    res.status(500).json({ success: false, error: 'Gagal update produk tiket.' });
  }
});

// GET /api/admin/tickets/products/:id/variants
router.get('/products/:id/variants', async (req, res) => {
  try {
    const productId = parseInt(req.params.id, 10);
    if (!productId) return res.status(400).json({ success: false, error: 'ID product tidak valid.' });
    const rows = await dbAll(
      `
      SELECT id, product_id, name, price, quota_per_day, is_active, created_at, updated_at
      FROM ticket_variants
      WHERE product_id = ?
      ORDER BY is_active DESC, price ASC, id ASC
      `,
      [productId]
    );
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error('GET /admin/tickets/products/:id/variants error:', e.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil varian.' });
  }
});

// POST /api/admin/tickets/variants
router.post('/variants', async (req, res) => {
  try {
    const raw = req.body || {};
    const product_id = parseInt(raw.product_id, 10);
    const name = sanitize(raw.name, 140);
    const price = Math.max(0, parseInt(raw.price, 10) || 0);
    const quota_per_day = Math.max(0, parseInt(raw.quota_per_day, 10) || 0);
    const is_active = raw.is_active === 0 || raw.is_active === '0' ? 0 : 1;

    if (!product_id) return res.status(400).json({ success: false, error: 'product_id wajib.' });
    if (!name) return res.status(400).json({ success: false, error: 'Nama varian wajib.' });
    if (!price) return res.status(400).json({ success: false, error: 'Harga varian wajib.' });

    const p = await dbGet(`SELECT id FROM ticket_products WHERE id = ? LIMIT 1`, [product_id]).catch(() => null);
    if (!p) return res.status(400).json({ success: false, error: 'Produk tidak ditemukan.' });

    const r = await dbRun(
      `
      INSERT INTO ticket_variants
        (product_id, name, price, quota_per_day, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `,
      [product_id, name, price, quota_per_day, is_active]
    );

    res.status(201).json({ success: true, id: r.lastID });
  } catch (e) {
    console.error('POST /admin/tickets/variants error:', e.message);
    res.status(500).json({ success: false, error: 'Gagal membuat varian.' });
  }
});

// PUT /api/admin/tickets/variants/:id
router.put('/variants/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ success: false, error: 'ID tidak valid.' });

    const raw = req.body || {};
    const name = sanitize(raw.name, 140);
    const price = Math.max(0, parseInt(raw.price, 10) || 0);
    const quota_per_day = Math.max(0, parseInt(raw.quota_per_day, 10) || 0);
    const is_active = raw.is_active === 0 || raw.is_active === '0' ? 0 : 1;

    if (!name) return res.status(400).json({ success: false, error: 'Nama varian wajib.' });
    if (!price) return res.status(400).json({ success: false, error: 'Harga varian wajib.' });

    const r = await dbRun(
      `
      UPDATE ticket_variants
      SET name = ?, price = ?, quota_per_day = ?, is_active = ?, updated_at = datetime('now')
      WHERE id = ?
      `,
      [name, price, quota_per_day, is_active, id]
    );
    if (!r || r.changes === 0) return res.status(404).json({ success: false, error: 'Varian tidak ditemukan.' });
    res.json({ success: true });
  } catch (e) {
    console.error('PUT /admin/tickets/variants/:id error:', e.message);
    res.status(500).json({ success: false, error: 'Gagal update varian.' });
  }
});

module.exports = router;
