const express = require('express');
const db = require('../db');
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
router.use(auditAdmin({ actionPrefix: 'logisticsRoutes' }));

const VALID_TASK_TYPES = ['delivery', 'return'];
const VALID_STATUSES = ['scheduled', 'completed', 'cancelled'];

const normalizeTaskType = (v) => String(v || '').trim().toLowerCase();
const normalizeStatus = (v) => String(v || '').trim().toLowerCase();

// SQLite compatibility: bookings kadang simpan tanggal saja (YYYY-MM-DD) tanpa jam.
// Helper ini menyamakan jadi "YYYY-MM-DD HH:MM:SS" untuk dipakai di datetime().
const dtExpr = (col) => `CASE WHEN instr(${col}, ' ') > 0 THEN ${col} ELSE ${col} || ' 00:00:00' END`;

const computeBookingTotals = (row) => {
  if (!row) return null;
  const base = Number(row.base_price) || 0;
  const disc = Number(row.discount_amount) || 0;
  const service = Number(row.service_fee) || 0;
  const extend = Number(row.extend_fee) || 0;
  const addon = Number(row.addon_fee) || 0;
  const delivery = Number(row.delivery_fee) || 0;
  const paid = Number(row.paid_amount) || 0;

  const calcTotal = base - disc + service + extend + addon + delivery;
  const total = calcTotal > 0 ? calcTotal : (Number(row.total_price) || 0);
  const paymentStatus = String(row.payment_status || '').toLowerCase();
  const outstanding = paymentStatus === 'paid' ? 0 : Math.max(0, total - paid);

  return {
    total_price: total,
    paid_amount: paid,
    outstanding_amount: outstanding,
    payment_status: row.payment_status,
  };
};

const summarizeGearFromAddons = (addons) => {
  const out = { helm: 0, jas_hujan: 0, helm_anak: 0 };
  for (const a of addons || []) {
    const name = String(a?.name_snapshot || a?.name || '').toLowerCase();
    const qty = Number(a?.qty) || 0;
    if (!qty) continue;
    if (name.includes('helm anak')) out.helm_anak += qty;
    else if (name.includes('jas hujan')) out.jas_hujan += qty;
    else if (name.includes('helm')) out.helm += qty;
  }
  return out;
};

// ==========================================
// GET /api/admin/logistics/tasks
// Permission: logistics (view & checklist)
// ==========================================
router.get('/tasks', requirePermission('logistics'), async (req, res) => {
  try {
    const taskType = req.query.task_type ? normalizeTaskType(req.query.task_type) : null;
    const status = req.query.status ? normalizeStatus(req.query.status) : null;
    const q = String(req.query.q || '').trim();
    const from = String(req.query.from || '').trim();
    const to = String(req.query.to || '').trim();

    const where = [];
    const params = [];

    if (taskType) {
      if (!VALID_TASK_TYPES.includes(taskType)) {
        return res.status(400).json({ success: false, error: 'task_type tidak valid.' });
      }
      where.push('t.task_type = ?');
      params.push(taskType);
    }

    if (status) {
      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({ success: false, error: 'status tidak valid.' });
      }
      where.push('t.status = ?');
      params.push(status);
    }

    if (from) {
      where.push('t.scheduled_at >= ?');
      params.push(from);
    }
    if (to) {
      where.push('t.scheduled_at <= ?');
      params.push(to);
    }

    if (q) {
      where.push(`(
        IFNULL(t.customer_name,'') LIKE ? OR
        IFNULL(t.motor_type,'') LIKE ? OR
        IFNULL(t.location_text,'') LIKE ? OR
        IFNULL(t.order_id,'') LIKE ?
      )`);
      const like = `%${q}%`;
      params.push(like, like, like, like);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const rows = await dbAll(
      `
      SELECT
        t.*,
        cu.name AS completed_by_name,
        cr.name AS created_by_name
      FROM logistics_tasks t
      LEFT JOIN users cu ON t.completed_by = cu.id
      LEFT JOIN users cr ON t.created_by = cr.id
      ${whereSql}
      ORDER BY t.scheduled_at ASC, t.id DESC
      `,
      params
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /admin/logistics/tasks error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil data jadwal.' });
  }
});

// ==========================================
// GET /api/admin/logistics/pending-bookings
// Permission: logistics (view)
// Tujuan: tampilkan booking yang belum punya task logistics (delivery/return)
// agar admin tinggal klik kartu dan assign pengantar tanpa input ulang.
// ==========================================
router.get('/pending-bookings', requirePermission('logistics'), async (req, res) => {
  try {
    const taskType = req.query.task_type ? normalizeTaskType(req.query.task_type) : null;
    if (!taskType || !VALID_TASK_TYPES.includes(taskType)) {
      return res.status(400).json({ success: false, error: 'task_type wajib: delivery / return.' });
    }

    const date = String(req.query.date || '').trim(); // YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ success: false, error: 'Query date wajib format YYYY-MM-DD.' });
    }

    const from = `${date} 00:00:00`;
    const to = `${date} 23:59:59`;

    const whenCol = taskType === 'delivery' ? 'b.start_date' : 'b.end_date';

    const rows = await dbAll(
      `
      SELECT
        b.order_id,
        b.item_type,
        b.item_name,
        b.location,
        b.start_date,
        b.end_date,
        b.delivery_type,
        b.delivery_address,
        b.delivery_station_id,
        b.unit_id,
        b.plate_number,
        u.name AS user_name,
        u.phone AS user_phone
      FROM bookings b
      LEFT JOIN users u ON b.user_id = u.id
      LEFT JOIN logistics_tasks t
        ON t.order_id = b.order_id
       AND t.task_type = ?
       AND t.status <> 'cancelled'
      WHERE lower(COALESCE(b.item_type, '')) = 'motor'
        AND lower(COALESCE(b.payment_status, '')) = 'paid'
        AND lower(COALESCE(b.status, '')) <> 'cancelled'
        AND datetime(${dtExpr(whenCol)}) >= datetime(?)
        AND datetime(${dtExpr(whenCol)}) <= datetime(?)
        AND t.id IS NULL
      ORDER BY datetime(${dtExpr(whenCol)}) ASC, b.order_id ASC
      `,
      [taskType, from, to]
    );

    const defaultTime = taskType === 'delivery' ? '09:00:00' : '17:00:00';
    const withSuggested = (rows || []).map((b) => {
      const rawWhen = String((taskType === 'delivery' ? b.start_date : b.end_date) || '').trim();
      // Jika booking hanya tanggal, kita set jam default agar datetime-local terisi.
      const suggested_at = rawWhen && rawWhen.length <= 10
        ? `${rawWhen} ${defaultTime}`
        : rawWhen;
      return { ...b, suggested_at };
    });

    res.json({ success: true, data: withSuggested });
  } catch (err) {
    console.error('GET /admin/logistics/pending-bookings error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil booking pending.' });
  }
});

// ==========================================
// POST /api/admin/logistics/tasks
// Permission: logistics_manage (create/edit schedule)
// ==========================================
router.post('/tasks', requirePermission('logistics_manage'), async (req, res) => {
  try {
    const body = req.body || {};

    const taskType = normalizeTaskType(body.task_type);
    if (!VALID_TASK_TYPES.includes(taskType)) {
      return res.status(400).json({ success: false, error: 'task_type wajib: delivery / return.' });
    }

    const scheduledAt = String(body.scheduled_at || '').trim();
    if (!scheduledAt) {
      return res.status(400).json({ success: false, error: 'scheduled_at wajib diisi.' });
    }

    const orderId = body.order_id ? String(body.order_id).trim() : null;
    let unitId = body.unit_id !== undefined && body.unit_id !== null && String(body.unit_id).trim() !== ''
      ? Number(body.unit_id)
      : null;
    if (unitId !== null && Number.isNaN(unitId)) unitId = null;

    let motorType = body.motor_type ? String(body.motor_type).trim() : null;
    let customerName = body.customer_name ? String(body.customer_name).trim() : null;
    let customerPhone = body.customer_phone ? String(body.customer_phone).trim() : null;
    let locationText = body.location_text ? String(body.location_text).trim() : null;

    if (orderId && (!motorType || !customerName || !customerPhone || !locationText || !unitId)) {
      const b = await dbGet(
        `
        SELECT
          b.order_id,
          b.item_name,
          b.location,
          b.delivery_address,
          b.unit_id,
          u.name AS user_name,
          u.phone AS user_phone
        FROM bookings b
        LEFT JOIN users u ON b.user_id = u.id
        WHERE b.order_id = ?
        LIMIT 1
        `,
        [orderId]
      );
      if (!b) {
        return res.status(404).json({ success: false, error: 'order_id tidak ditemukan.' });
      }
      motorType = motorType || b.item_name || null;
      customerName = customerName || b.user_name || null;
      customerPhone = customerPhone || b.user_phone || null;
      locationText = locationText || b.delivery_address || b.location || null;
      if (!unitId && b.unit_id) {
        const parsedUnitId = Number(b.unit_id);
        if (!Number.isNaN(parsedUnitId)) unitId = parsedUnitId;
      }
    }

    const assignedToName = body.assigned_to_name ? String(body.assigned_to_name).trim() : null;
    const notes = body.notes ? String(body.notes).trim() : null;

    const createdBy = req.user?.id || null;

    const insert = await dbRun(
      `
      INSERT INTO logistics_tasks
      (task_type, order_id, unit_id, motor_type, customer_name, customer_phone, location_text,
       scheduled_at, status, assigned_to_name, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', ?, ?, ?)
      `,
      [
        taskType,
        orderId,
        unitId,
        motorType,
        customerName,
        customerPhone,
        locationText,
        scheduledAt,
        assignedToName,
        notes,
        createdBy,
      ]
    );

    const created = await dbGet(
      `SELECT * FROM logistics_tasks WHERE id = ? LIMIT 1`,
      [insert.lastID]
    );

    res.json({ success: true, message: 'Jadwal berhasil dibuat.', data: created });
  } catch (err) {
    console.error('POST /admin/logistics/tasks error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal membuat jadwal.' });
  }
});

// ==========================================
// GET /api/admin/logistics/tasks/:id
// Permission: logistics
// ==========================================
router.get('/tasks/:id', requirePermission('logistics'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, error: 'ID tidak valid.' });

    const row = await dbGet(
      `
      SELECT
        t.*,
        cu.name AS completed_by_name,
        cr.name AS created_by_name
      FROM logistics_tasks t
      LEFT JOIN users cu ON t.completed_by = cu.id
      LEFT JOIN users cr ON t.created_by = cr.id
      WHERE t.id = ?
      LIMIT 1
      `,
      [id]
    );
    if (!row) return res.status(404).json({ success: false, error: 'Data tidak ditemukan.' });

    let booking = null;
    let addons = [];
    let gear_summary = { helm: 0, jas_hujan: 0, helm_anak: 0 };

    if (row.order_id) {
      try {
        const b = await dbGet(
          `
          SELECT
            b.*,
            IFNULL(b.base_price, 0) as base_price,
            IFNULL(b.discount_amount, 0) as discount_amount,
            IFNULL(b.service_fee, 0) as service_fee,
            IFNULL(b.extend_fee, 0) as extend_fee,
            IFNULL(b.addon_fee, 0) as addon_fee,
            IFNULL(b.delivery_fee, 0) as delivery_fee,
            IFNULL(b.paid_amount, 0) as paid_amount,
            u.name as user_name,
            u.phone as user_phone
          FROM bookings b
          LEFT JOIN users u ON b.user_id = u.id
          WHERE b.order_id = ?
          LIMIT 1
          `,
          [row.order_id]
        );

        const totals = computeBookingTotals(b);
        booking = b
          ? {
              order_id: b.order_id,
              item_type: b.item_type,
              item_name: b.item_name,
              start_date: b.start_date,
              end_date: b.end_date,
              location: b.location,
              delivery_address: b.delivery_address,
              unit_id: b.unit_id,
              plate_number: b.plate_number,
              user_name: b.user_name,
              user_phone: b.user_phone,
              ...totals,
            }
          : null;

        addons = await dbAll(
          `
          SELECT
            id,
            order_id,
            addon_id,
            name_snapshot,
            addon_type_snapshot,
            qty,
            unit_price,
            total_price
          FROM booking_motor_addons
          WHERE order_id = ?
          ORDER BY id ASC
          `,
          [row.order_id]
        );
        gear_summary = summarizeGearFromAddons(addons);
      } catch {
        // ignore booking/addons errors so detail task still works
      }
    }

    res.json({ success: true, data: { ...row, booking, addons, gear_summary } });
  } catch (err) {
    console.error('GET /admin/logistics/tasks/:id error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil detail.' });
  }
});

// ==========================================
// PATCH /api/admin/logistics/tasks/:id
// Permission: logistics_manage
// ==========================================
router.patch('/tasks/:id', requirePermission('logistics_manage'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, error: 'ID tidak valid.' });

    const current = await dbGet(`SELECT * FROM logistics_tasks WHERE id = ? LIMIT 1`, [id]);
    if (!current) return res.status(404).json({ success: false, error: 'Data tidak ditemukan.' });

    const body = req.body || {};

    const patch = {};
    if (body.scheduled_at !== undefined) patch.scheduled_at = String(body.scheduled_at || '').trim();
    if (body.location_text !== undefined) patch.location_text = String(body.location_text || '').trim();
    if (body.notes !== undefined) patch.notes = String(body.notes || '').trim();
    if (body.assigned_to_name !== undefined) patch.assigned_to_name = String(body.assigned_to_name || '').trim();
    if (body.status !== undefined) patch.status = normalizeStatus(body.status);

    if (patch.status && !VALID_STATUSES.includes(patch.status)) {
      return res.status(400).json({ success: false, error: 'status tidak valid.' });
    }
    if (patch.scheduled_at !== undefined && !patch.scheduled_at) {
      return res.status(400).json({ success: false, error: 'scheduled_at tidak boleh kosong.' });
    }

    const fields = Object.keys(patch).filter((k) => patch[k] !== undefined);
    if (fields.length === 0) {
      return res.json({ success: true, message: 'Tidak ada perubahan.' });
    }

    const setSql = fields.map((f) => `${f} = ?`).join(', ');
    const params = fields.map((f) => patch[f]);
    params.push(id);

    await dbRun(`UPDATE logistics_tasks SET ${setSql} WHERE id = ?`, params);

    const updated = await dbGet(`SELECT * FROM logistics_tasks WHERE id = ? LIMIT 1`, [id]);
    res.json({ success: true, message: 'Jadwal berhasil diperbarui.', data: updated });
  } catch (err) {
    console.error('PATCH /admin/logistics/tasks/:id error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal memperbarui jadwal.' });
  }
});

// ==========================================
// PATCH /api/admin/logistics/tasks/:id/complete
// Permission: logistics (delivery team checklist)
// ==========================================
router.patch('/tasks/:id/complete', requirePermission('logistics'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, error: 'ID tidak valid.' });

    const current = await dbGet(`SELECT * FROM logistics_tasks WHERE id = ? LIMIT 1`, [id]);
    if (!current) return res.status(404).json({ success: false, error: 'Data tidak ditemukan.' });
    if (String(current.status).toLowerCase() === 'cancelled') {
      return res.status(400).json({ success: false, error: 'Tugas sudah dibatalkan.' });
    }
    if (String(current.status).toLowerCase() === 'completed') {
      return res.json({ success: true, message: 'Tugas sudah selesai.', data: current });
    }

    await dbRun(
      `UPDATE logistics_tasks
       SET status = 'completed', completed_at = datetime('now'), completed_by = ?
       WHERE id = ?`,
      [req.user?.id || null, id]
    );

    const updated = await dbGet(`SELECT * FROM logistics_tasks WHERE id = ? LIMIT 1`, [id]);
    res.json({ success: true, message: 'Checklist berhasil. Tugas ditandai selesai.', data: updated });
  } catch (err) {
    console.error('PATCH /admin/logistics/tasks/:id/complete error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal menyelesaikan tugas.' });
  }
});

// ==========================================
// PATCH /api/admin/logistics/tasks/:id/cancel
// Permission: logistics_manage
// ==========================================
router.patch('/tasks/:id/cancel', requirePermission('logistics_manage'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, error: 'ID tidak valid.' });

    const current = await dbGet(`SELECT * FROM logistics_tasks WHERE id = ? LIMIT 1`, [id]);
    if (!current) return res.status(404).json({ success: false, error: 'Data tidak ditemukan.' });

    await dbRun(
      `UPDATE logistics_tasks SET status = 'cancelled' WHERE id = ?`,
      [id]
    );
    const updated = await dbGet(`SELECT * FROM logistics_tasks WHERE id = ? LIMIT 1`, [id]);
    res.json({ success: true, message: 'Tugas dibatalkan.', data: updated });
  } catch (err) {
    console.error('PATCH /admin/logistics/tasks/:id/cancel error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal membatalkan tugas.' });
  }
});

// ==========================================
// DELETE /api/admin/logistics/tasks/:id
// Permission: logistics_manage
// Hard delete (untuk salah input)
// ==========================================
router.delete('/tasks/:id', requirePermission('logistics_manage'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, error: 'ID tidak valid.' });

    const current = await dbGet(`SELECT id FROM logistics_tasks WHERE id = ? LIMIT 1`, [id]);
    if (!current) return res.status(404).json({ success: false, error: 'Data tidak ditemukan.' });

    await dbRun(`DELETE FROM logistics_tasks WHERE id = ?`, [id]);
    res.json({ success: true, message: 'Tugas berhasil dihapus.' });
  } catch (err) {
    console.error('DELETE /admin/logistics/tasks/:id error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal menghapus tugas.' });
  }
});

module.exports = router;
