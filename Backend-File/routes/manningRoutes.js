const express = require('express');
const db = require('../db');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { verifyAdmin, requirePermission } = require('../middlewares/authMiddleware');
const { auditAdmin } = require('../middlewares/auditMiddleware');

const router = express.Router();

// ==========================================
// HELPER: Promisify DB
// ==========================================
const dbGet = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
});
const dbAll = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || [])));
});
const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function (err) {
    if (err) return reject(err);
    resolve({ lastID: this.lastID, changes: this.changes });
  });
});

// ==========================================
// AUTH + AUDIT
// ==========================================
router.use(verifyAdmin);
router.use(auditAdmin({ actionPrefix: 'manningRoutes' }));

const norm = (v) => String(v || '').trim();
const normLower = (v) => norm(v).toLowerCase();

const VALID_STATUSES = ['on', 'off', 'leave', 'sick'];

const toYmd = (value) => {
  const s = norm(value);
  // Expect yyyy-mm-dd (we store text; keep strict to avoid timezone surprises)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return s;
};

// ==========================================
// EMPLOYEES (manage)
// Permission: manning
// ==========================================
// Helper: fetch employee with login status
const getEmployeeWithLogin = async (id) => {
  return dbGet(
    `SELECT e.*, CASE WHEN u.id IS NOT NULL THEN 1 ELSE 0 END AS has_login, u.email AS login_email, u.role AS login_role
     FROM employees e
     LEFT JOIN users u ON u.id = e.user_id
     WHERE e.id = ?`,
    [id]
  );
};

router.get('/employees', requirePermission('manning'), async (req, res) => {
  try {
    const location = norm(req.query.location);
    const activeOnly = String(req.query.active_only || '1') !== '0';

    const where = [];
    const params = [];

    if (activeOnly) where.push('e.is_active = 1');
    if (location) {
      where.push('e.base_location = ?');
      params.push(location);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const rows = await dbAll(
      `SELECT e.*,
         CASE WHEN u.id IS NOT NULL THEN 1 ELSE 0 END AS has_login,
         u.email AS login_email,
         u.role AS login_role
       FROM employees e
       LEFT JOIN users u ON u.id = e.user_id
       ${whereSql}
       ORDER BY e.is_active DESC, e.base_location ASC, e.name ASC`,
      params
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /admin/manning/employees error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil data karyawan.' });
  }
});

router.post('/employees', requirePermission('manning'), async (req, res) => {
  try {
    const name = norm(req.body?.name);
    const phone = norm(req.body?.phone) || null;
    const email = norm(req.body?.email) || null;
    const base_location = norm(req.body?.base_location) || 'Yogyakarta';
    const role_tag = norm(req.body?.role_tag) || 'delivery';
    const is_active = req.body?.is_active === 0 || req.body?.is_active === '0' ? 0 : 1;
    const loginData = req.body?.login || null; // { email, password }

    if (!name) {
      return res.status(400).json({ success: false, error: 'Nama karyawan wajib diisi.' });
    }

    let userId = null;

    if (loginData?.email && loginData?.password) {
      const loginEmail = normLower(loginData.email);
      const existing = await dbGet(`SELECT id FROM users WHERE email = ?`, [loginEmail]);
      if (existing) {
        return res.status(400).json({ success: false, error: 'Email login sudah digunakan akun lain.' });
      }
      const hashed = await bcrypt.hash(loginData.password, 10);
      userId = 'STF-' + crypto.randomBytes(4).toString('hex').toUpperCase();
      await dbRun(
        `INSERT INTO users (id, name, email, password, phone, role, permissions, join_date, kyc_status)
         VALUES (?, ?, ?, ?, ?, 'subadmin', '["logistics"]', ?, 'approved')`,
        [userId, name, loginEmail, hashed, phone || '-', new Date().toISOString()]
      );
    }

    const r = await dbRun(
      `INSERT INTO employees (name, phone, email, base_location, role_tag, is_active, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, phone, email, base_location, role_tag, is_active, userId]
    );

    const row = await getEmployeeWithLogin(r.lastID);
    res.json({ success: true, data: row });
  } catch (err) {
    console.error('POST /admin/manning/employees error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal menambah karyawan.' });
  }
});

router.put('/employees/:id', requirePermission('manning'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, error: 'ID tidak valid.' });

    const current = await dbGet(`SELECT * FROM employees WHERE id = ?`, [id]);
    if (!current) return res.status(404).json({ success: false, error: 'Karyawan tidak ditemukan.' });

    const name = norm(req.body?.name) || current.name;
    const phone = norm(req.body?.phone) || null;
    const email = norm(req.body?.email) || null;
    const base_location = norm(req.body?.base_location) || current.base_location;
    const role_tag = norm(req.body?.role_tag) || current.role_tag;
    const is_active = req.body?.is_active === 0 || req.body?.is_active === '0' ? 0 : 1;
    const loginData = req.body?.login || null; // { email, password } to create new login

    if (!name) {
      return res.status(400).json({ success: false, error: 'Nama karyawan wajib diisi.' });
    }

    let userId = current.user_id || null;

    // Create new login if requested and employee doesn't have one yet
    if (loginData?.email && loginData?.password && !userId) {
      const loginEmail = normLower(loginData.email);
      const existing = await dbGet(`SELECT id FROM users WHERE email = ?`, [loginEmail]);
      if (existing) {
        return res.status(400).json({ success: false, error: 'Email login sudah digunakan akun lain.' });
      }
      const hashed = await bcrypt.hash(loginData.password, 10);
      userId = 'STF-' + crypto.randomBytes(4).toString('hex').toUpperCase();
      await dbRun(
        `INSERT INTO users (id, name, email, password, phone, role, permissions, join_date, kyc_status)
         VALUES (?, ?, ?, ?, ?, 'subadmin', '["logistics"]', ?, 'approved')`,
        [userId, name, loginEmail, hashed, phone || current.phone || '-', new Date().toISOString()]
      );
    }

    // Sync name to linked user account
    if (userId) {
      await dbRun(`UPDATE users SET name = ? WHERE id = ?`, [name, userId]);
    }

    await dbRun(
      `UPDATE employees
       SET name = ?, phone = ?, email = ?, base_location = ?, role_tag = ?, is_active = ?, user_id = ?
       WHERE id = ?`,
      [name, phone, email, base_location, role_tag, is_active, userId, id]
    );

    const row = await getEmployeeWithLogin(id);
    res.json({ success: true, data: row });
  } catch (err) {
    console.error('PUT /admin/manning/employees/:id error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal memperbarui karyawan.' });
  }
});

// Remove login account from an employee (unlink + delete user record)
router.delete('/employees/:id/login', requirePermission('manning'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, error: 'ID tidak valid.' });

    const emp = await dbGet(`SELECT * FROM employees WHERE id = ?`, [id]);
    if (!emp) return res.status(404).json({ success: false, error: 'Karyawan tidak ditemukan.' });
    if (!emp.user_id) return res.status(400).json({ success: false, error: 'Karyawan tidak memiliki akun login.' });

    await dbRun(`UPDATE employees SET user_id = NULL WHERE id = ?`, [id]);
    await dbRun(`DELETE FROM users WHERE id = ?`, [emp.user_id]);

    res.json({ success: true, message: 'Akun login berhasil dihapus.' });
  } catch (err) {
    console.error('DELETE /admin/manning/employees/:id/login error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal menghapus akun login.' });
  }
});

router.delete('/employees/:id', requirePermission('manning'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, error: 'ID tidak valid.' });

    // Soft delete: keep history availability if needed; set inactive.
    await dbRun(`UPDATE employees SET is_active = 0 WHERE id = ?`, [id]);
    res.json({ success: true, message: 'Karyawan dinonaktifkan.' });
  } catch (err) {
    console.error('DELETE /admin/manning/employees/:id error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal menonaktifkan karyawan.' });
  }
});

// ==========================================
// AVAILABILITY (manage)
// Permission: manning
// ==========================================
router.get('/availability/day', requirePermission('manning'), async (req, res) => {
  try {
    const date = toYmd(req.query.date);
    if (!date) return res.status(400).json({ success: false, error: 'Query date wajib format YYYY-MM-DD.' });

    const location = norm(req.query.location);
    const activeOnly = String(req.query.active_only || '1') !== '0';

    const where = [];
    const params = [date];

    if (activeOnly) where.push('e.is_active = 1');
    if (location) {
      where.push('e.base_location = ?');
      params.push(location);
    }

    const whereSql = where.length ? `AND ${where.join(' AND ')}` : '';

    // Default status: 'on' jika tidak ada entry.
    const rows = await dbAll(
      `
        SELECT
          e.id,
          e.name,
          e.phone,
          e.email,
          e.base_location,
          e.role_tag,
          e.is_active,
          e.user_id,
          CASE WHEN u.id IS NOT NULL THEN 1 ELSE 0 END AS has_login,
          u.email AS login_email,
          ? as date,
          COALESCE(a.status, 'on') as status,
          a.note
        FROM employees e
        LEFT JOIN employee_availability a
          ON a.employee_id = e.id AND a.date = ?
        LEFT JOIN users u ON u.id = e.user_id
        WHERE 1=1 ${whereSql}
        ORDER BY e.base_location ASC, e.name ASC
      `,
      [date, date, ...params.slice(1)]
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /admin/manning/availability/day error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil data ketersediaan.' });
  }
});

router.post('/availability', requirePermission('manning'), async (req, res) => {
  try {
    const employee_id = Number(req.body?.employee_id);
    const date = toYmd(req.body?.date);
    const status = normLower(req.body?.status);
    const note = norm(req.body?.note) || null;

    if (!employee_id) return res.status(400).json({ success: false, error: 'employee_id wajib.' });
    if (!date) return res.status(400).json({ success: false, error: 'date wajib format YYYY-MM-DD.' });
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, error: 'status tidak valid (on/off/leave/sick).' });
    }

    const emp = await dbGet(`SELECT id FROM employees WHERE id = ? LIMIT 1`, [employee_id]);
    if (!emp) return res.status(404).json({ success: false, error: 'Karyawan tidak ditemukan.' });

    if (status === 'on') {
      // 'on' adalah default; hapus entry agar DB bersih.
      await dbRun(`DELETE FROM employee_availability WHERE employee_id = ? AND date = ?`, [employee_id, date]);
      return res.json({ success: true, message: 'Status direset ke ON (default).' });
    }

    await dbRun(
      `
        INSERT INTO employee_availability (employee_id, date, status, note)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(employee_id, date) DO UPDATE SET
          status = excluded.status,
          note = excluded.note
      `,
      [employee_id, date, status, note]
    );

    const row = await dbGet(
      `SELECT * FROM employee_availability WHERE employee_id = ? AND date = ?`,
      [employee_id, date]
    );
    res.json({ success: true, data: row });
  } catch (err) {
    console.error('POST /admin/manning/availability error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal menyimpan ketersediaan.' });
  }
});

// ==========================================
// TEAM TODAY (view for logistics)
// Permission: logistics
// ==========================================
router.get('/today', requirePermission('logistics'), async (req, res) => {
  try {
    const date = toYmd(req.query.date) || toYmd(new Date().toISOString().slice(0, 10));
    if (!date) return res.status(400).json({ success: false, error: 'date tidak valid.' });

    const location = norm(req.query.location);
    const role_tag = norm(req.query.role_tag);

    const where = ['e.is_active = 1'];
    const params = [date, date];

    if (location) {
      where.push('e.base_location = ?');
      params.push(location);
    }
    if (role_tag) {
      where.push('e.role_tag = ?');
      params.push(role_tag);
    }

    const rows = await dbAll(
      `
        SELECT
          e.id,
          e.name,
          e.phone,
          e.email,
          e.base_location,
          e.role_tag,
          e.user_id,
          ? as date,
          COALESCE(a.status, 'on') as status,
          a.note
        FROM employees e
        LEFT JOIN employee_availability a
          ON a.employee_id = e.id AND a.date = ?
        WHERE ${where.join(' AND ')}
        ORDER BY e.base_location ASC, e.name ASC
      `,
      params
    );

    const counts = rows.reduce((acc, r) => {
      const s = String(r.status || 'on');
      acc[s] = (acc[s] || 0) + 1;
      acc.total += 1;
      return acc;
    }, { total: 0, on: 0, off: 0, leave: 0, sick: 0 });

    res.json({ success: true, data: rows, counts });
  } catch (err) {
    console.error('GET /admin/manning/today error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil data manning hari ini.' });
  }
});

module.exports = router;

