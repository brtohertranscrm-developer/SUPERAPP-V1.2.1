const express = require('express');
const sanitizeHtml = require('sanitize-html');
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

const safeJson = (value, fallback) => {
  try {
    if (value == null) return fallback;
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

const sanitizeOptions = {
  allowedTags: [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's',
    'h2', 'h3', 'blockquote',
    'ul', 'ol', 'li',
    'a',
    'code', 'pre',
    'span', 'div',
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    '*': ['class'],
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowProtocolRelative: false,
  transformTags: {
    a: (tagName, attribs) => {
      const next = { ...attribs };
      // Default target blank for external links (optional); keep relative as-is.
      const href = String(next.href || '');
      const isExternal = /^https?:\/\//i.test(href);
      if (isExternal) {
        next.target = next.target || '_blank';
        next.rel = next.rel || 'noopener noreferrer';
      }
      return { tagName, attribs: next };
    },
  },
};

const normalizeSlug = (slug) => String(slug || '').trim().replace(/^\/+/, '').replace(/\/+$/, '');

const parseEmbedUrl = (provider, url) => {
  const p = String(provider || '').trim().toLowerCase();
  const raw = String(url || '').trim();
  if (!p || !raw) return null;

  let u = null;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (!/^https?:$/.test(u.protocol)) return null;

  const host = u.hostname.toLowerCase();

  const isHostAllowed = (allowedHosts) => allowedHosts.includes(host);

  if (p === 'youtube') {
    // Accept watch?v=ID, youtu.be/ID, youtube.com/shorts/ID
    if (!isHostAllowed(['youtube.com', 'www.youtube.com', 'youtu.be', 'www.youtu.be'])) return null;
    let id = '';
    if (host.includes('youtu.be')) {
      id = u.pathname.replace(/^\/+/, '').split('/')[0] || '';
    } else if (u.pathname.startsWith('/shorts/')) {
      id = u.pathname.split('/')[2] || '';
    } else {
      id = u.searchParams.get('v') || '';
    }
    if (!id) return null;
    return { provider: 'youtube', url: `https://www.youtube.com/embed/${encodeURIComponent(id)}` };
  }

  if (p === 'instagram') {
    if (!isHostAllowed(['instagram.com', 'www.instagram.com'])) return null;
    const parts = u.pathname.split('/').filter(Boolean);
    // /p/{code}/ or /reel/{code}/
    const type = parts[0];
    const code = parts[1];
    if (!code || !['p', 'reel'].includes(type)) return null;
    return { provider: 'instagram', url: `https://www.instagram.com/${type}/${encodeURIComponent(code)}/embed` };
  }

  if (p === 'tiktok') {
    if (!isHostAllowed(['tiktok.com', 'www.tiktok.com'])) return null;
    // Expect .../video/{id}
    const match = u.pathname.match(/\/video\/(\d+)/);
    const id = match?.[1] || '';
    if (!id) return null;
    return { provider: 'tiktok', url: `https://www.tiktok.com/embed/v2/${encodeURIComponent(id)}` };
  }

  if (p === 'maps') {
    // Require a Google Maps embed URL (from "Share" → "Embed a map"), typically google.com/maps/embed?pb=...
    if (!isHostAllowed(['www.google.com', 'google.com', 'maps.google.com', 'www.google.co.id', 'www.google.co'])) {
      // keep strict: only allow Google hosts
      return null;
    }
    if (!u.pathname.includes('/maps')) return null;
    return { provider: 'maps', url: raw };
  }

  return null;
};

const sanitizeSections = (sectionsRaw) => {
  const sections = Array.isArray(sectionsRaw) ? sectionsRaw : [];
  return sections.map((s, idx) => {
    const key = String(s?.key || `section-${idx + 1}`).trim() || `section-${idx + 1}`;
    const title = String(s?.title || '').trim();
    const body_html = sanitizeHtml(String(s?.body_html || ''), sanitizeOptions);
    const embed = s?.embed && typeof s.embed === 'object'
      ? parseEmbedUrl(s.embed.provider, s.embed.url)
      : null;
    return embed ? { key, title, body_html, embed } : { key, title, body_html };
  });
};

const sanitizeFaqs = (faqsRaw) => {
  const faqs = Array.isArray(faqsRaw) ? faqsRaw : [];
  return faqs
    .map((f) => ({ q: String(f?.q || '').trim(), a: String(f?.a || '').trim() }))
    .filter((f) => f.q && f.a);
};

router.use(verifyAdmin);
router.use(requirePermission('content'));

// List pages
router.get('/', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim().toLowerCase();
    const city = String(req.query.city || '').trim().toLowerCase();
    const service = String(req.query.service || '').trim().toLowerCase();

    const conditions = [];
    const params = [];

    if (q) {
      conditions.push('(lower(slug) LIKE ? OR lower(title) LIKE ? OR lower(h1) LIKE ?)');
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    if (city) {
      conditions.push('lower(city) = ?');
      params.push(city);
    }
    if (service) {
      conditions.push('lower(service) = ?');
      params.push(service);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = await dbAll(
      `SELECT id, slug, city, service, title, meta_description, h1, is_published, updated_at, updated_by
       FROM seo_pages
       ${where}
       ORDER BY updated_at DESC, id DESC`,
      params
    );

    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /admin/seo-pages error:', err.message);
    return res.status(500).json({ success: false, error: 'Gagal mengambil daftar halaman.' });
  }
});

// Get one page (including sections/faqs)
router.get('/:id', async (req, res) => {
  try {
    const row = await dbGet(`SELECT * FROM seo_pages WHERE id = ? LIMIT 1`, [req.params.id]);
    if (!row) return res.status(404).json({ success: false, error: 'Halaman tidak ditemukan.' });

    return res.json({
      success: true,
      data: {
        ...row,
        sections: safeJson(row.sections_json, []),
        faqs: safeJson(row.faqs_json, []),
      },
    });
  } catch (err) {
    console.error('GET /admin/seo-pages/:id error:', err.message);
    return res.status(500).json({ success: false, error: 'Gagal mengambil detail halaman.' });
  }
});

// Create page
router.post('/', async (req, res) => {
  try {
    const {
      slug,
      city,
      service,
      title,
      meta_description,
      h1,
      sections,
      faqs,
      is_published,
    } = req.body || {};

    const slugNorm = normalizeSlug(slug);
    if (!slugNorm) return res.status(400).json({ success: false, error: 'Slug wajib diisi.' });

    const cleanedSections = sanitizeSections(sections);
    const cleanedFaqs = sanitizeFaqs(faqs);

    const now = new Date().toISOString();
    const result = await dbRun(
      `INSERT INTO seo_pages
        (slug, city, service, title, meta_description, h1, sections_json, faqs_json, is_published, created_at, updated_at, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        slugNorm,
        city ? String(city).trim() : null,
        service ? String(service).trim() : null,
        title ? String(title).trim() : null,
        meta_description ? String(meta_description).trim() : null,
        h1 ? String(h1).trim() : null,
        JSON.stringify(cleanedSections),
        JSON.stringify(cleanedFaqs),
        is_published ? 1 : 0,
        now,
        now,
        req.user?.id || null,
      ]
    );

    return res.status(201).json({ success: true, id: result.lastID });
  } catch (err) {
    if (String(err.message || '').includes('UNIQUE')) {
      return res.status(409).json({ success: false, error: 'Slug sudah digunakan.' });
    }
    console.error('POST /admin/seo-pages error:', err.message);
    return res.status(500).json({ success: false, error: 'Gagal membuat halaman.' });
  }
});

// Update page
router.put('/:id', async (req, res) => {
  try {
    const existing = await dbGet(`SELECT id FROM seo_pages WHERE id = ? LIMIT 1`, [req.params.id]);
    if (!existing) return res.status(404).json({ success: false, error: 'Halaman tidak ditemukan.' });

    const {
      slug,
      city,
      service,
      title,
      meta_description,
      h1,
      sections,
      faqs,
      is_published,
    } = req.body || {};

    const slugNorm = normalizeSlug(slug);
    if (!slugNorm) return res.status(400).json({ success: false, error: 'Slug wajib diisi.' });

    const owner = await dbGet(`SELECT id FROM seo_pages WHERE slug = ? AND id != ? LIMIT 1`, [slugNorm, req.params.id]);
    if (owner) return res.status(409).json({ success: false, error: 'Slug sudah digunakan halaman lain.' });

    const cleanedSections = sanitizeSections(sections);
    const cleanedFaqs = sanitizeFaqs(faqs);
    const now = new Date().toISOString();

    await dbRun(
      `UPDATE seo_pages
       SET slug = ?, city = ?, service = ?, title = ?, meta_description = ?, h1 = ?,
           sections_json = ?, faqs_json = ?, is_published = ?, updated_at = ?, updated_by = ?
       WHERE id = ?`,
      [
        slugNorm,
        city ? String(city).trim() : null,
        service ? String(service).trim() : null,
        title ? String(title).trim() : null,
        meta_description ? String(meta_description).trim() : null,
        h1 ? String(h1).trim() : null,
        JSON.stringify(cleanedSections),
        JSON.stringify(cleanedFaqs),
        is_published ? 1 : 0,
        now,
        req.user?.id || null,
        req.params.id,
      ]
    );

    return res.json({ success: true });
  } catch (err) {
    console.error('PUT /admin/seo-pages/:id error:', err.message);
    return res.status(500).json({ success: false, error: 'Gagal memperbarui halaman.' });
  }
});

// Publish/unpublish convenience endpoint
router.patch('/:id/publish', async (req, res) => {
  try {
    const { is_published } = req.body || {};
    const now = new Date().toISOString();
    const result = await dbRun(
      `UPDATE seo_pages SET is_published = ?, updated_at = ?, updated_by = ? WHERE id = ?`,
      [is_published ? 1 : 0, now, req.user?.id || null, req.params.id]
    );
    if (!result.changes) return res.status(404).json({ success: false, error: 'Halaman tidak ditemukan.' });
    return res.json({ success: true });
  } catch (err) {
    console.error('PATCH /admin/seo-pages/:id/publish error:', err.message);
    return res.status(500).json({ success: false, error: 'Gagal mengubah status publish.' });
  }
});

module.exports = router;
