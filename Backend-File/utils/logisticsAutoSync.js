const db = require('../db');

const dbGet = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
});
const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function (err) {
    if (err) return reject(err);
    resolve({ lastID: this.lastID, changes: this.changes });
  });
});

const toTaskScheduledAt = (raw, defaultTimeHHMM) => {
  const v = String(raw || '').trim();
  if (!v) return '';

  // If ISO-ish: YYYY-MM-DDTHH:MM...
  if (v.includes('T')) return v.slice(0, 16);

  // If SQLite-ish: YYYY-MM-DD HH:MM:SS
  if (v.includes(' ')) {
    const [d, t] = v.split(' ');
    const hhmm = (t || '').slice(0, 5) || defaultTimeHHMM;
    return `${d}T${hhmm}`;
  }

  // Date-only: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return `${v}T${defaultTimeHHMM}`;

  // Fallback: keep first 16 chars (best-effort)
  return v.slice(0, 16);
};

const buildLocationText = (b) => {
  const delType = String(b?.delivery_type || '').trim().toLowerCase();
  if (delType && delType !== 'self') {
    if (b?.delivery_address) return String(b.delivery_address).trim();
    if (b?.delivery_station_id) return `Stasiun: ${String(b.delivery_station_id).trim()}`;
  }
  return String(b?.location || '').trim() || null;
};

const upsertLogisticsTasksForBooking = async ({ orderId, createdBy }) => {
  const order_id = String(orderId || '').trim();
  if (!order_id) return { ok: false, error: 'order_id kosong' };

  const b = await dbGet(
    `
    SELECT
      b.order_id,
      b.item_type,
      b.item_name,
      b.location,
      b.start_date,
      b.end_date,
      b.unit_id,
      b.plate_number,
      b.delivery_type,
      b.delivery_station_id,
      b.delivery_address,
      b.payment_status,
      b.status,
      u.name AS user_name,
      u.phone AS user_phone
    FROM bookings b
    LEFT JOIN users u ON b.user_id = u.id
    WHERE b.order_id = ?
    LIMIT 1
    `,
    [order_id]
  );

  if (!b) return { ok: false, error: 'booking tidak ditemukan' };

  const itemType = String(b.item_type || '').toLowerCase();
  if (!['motor', 'car'].includes(itemType)) return { ok: true, skipped: true };

  const paymentStatus = String(b.payment_status || '').toLowerCase();
  const bookingStatus = String(b.status || '').toLowerCase();
  if (paymentStatus !== 'paid') return { ok: true, skipped: true };
  if (bookingStatus === 'cancelled') return { ok: true, skipped: true };

  const customer_name = b.user_name || null;
  const customer_phone = b.user_phone || null;
  const motor_type = b.item_name || null; // Reuse field for mobil juga (tampil sebagai jenis unit di UI)
  const location_text = buildLocationText(b);
  const unit_id = b.unit_id !== undefined && b.unit_id !== null && String(b.unit_id) !== '' ? Number(b.unit_id) : null;

  const desired = [
    { task_type: 'delivery', scheduled_at: toTaskScheduledAt(b.start_date, '09:00') },
    { task_type: 'return', scheduled_at: toTaskScheduledAt(b.end_date, '17:00') },
  ].filter((t) => !!t.scheduled_at);

  for (const t of desired) {
    const existing = await dbGet(
      `
      SELECT id, status
      FROM logistics_tasks
      WHERE order_id = ? AND task_type = ?
      ORDER BY id DESC
      LIMIT 1
      `,
      [order_id, t.task_type]
    );

    if (existing) {
      const st = String(existing.status || '').toLowerCase();
      if (st === 'completed') continue;
      const nextStatus = st === 'cancelled' ? 'scheduled' : st || 'scheduled';
      await dbRun(
        `
        UPDATE logistics_tasks
        SET
          unit_id = ?,
          motor_type = ?,
          customer_name = ?,
          customer_phone = ?,
          location_text = ?,
          scheduled_at = ?,
          status = ?
        WHERE id = ?
        `,
        [unit_id, motor_type, customer_name, customer_phone, location_text, t.scheduled_at, nextStatus, existing.id]
      );
      continue;
    }

    await dbRun(
      `
      INSERT INTO logistics_tasks
        (task_type, order_id, unit_id, motor_type, customer_name, customer_phone, location_text, scheduled_at, status, assigned_to_name, notes, created_by, created_at)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', NULL, NULL, ?, datetime('now'))
      `,
      [t.task_type, order_id, unit_id, motor_type, customer_name, customer_phone, location_text, t.scheduled_at, createdBy || null]
    );
  }

  return { ok: true };
};

const cancelLogisticsTasksForBooking = async ({ orderId }) => {
  const order_id = String(orderId || '').trim();
  if (!order_id) return { ok: false, error: 'order_id kosong' };

  await dbRun(
    `
    UPDATE logistics_tasks
    SET status = 'cancelled'
    WHERE order_id = ?
      AND status <> 'completed'
    `,
    [order_id]
  );

  return { ok: true };
};

module.exports = {
  upsertLogisticsTasksForBooking,
  cancelLogisticsTasksForBooking,
};

