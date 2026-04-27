'use strict';

const crypto = require('crypto');
const db = require('../db');

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

const ymdFromAny = (value) => {
  if (!value) return null;
  const s = String(value).trim();
  // common ISO: YYYY-MM-DD...
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const buildVoucherCode = () => {
  const prefix = 'BTX';
  const rand = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `${prefix}-${Date.now().toString().slice(-6)}-${rand}`;
};

const issueTicketVouchersForOrder = async ({ orderId }) => {
  const order = String(orderId || '').trim();
  if (!order) return { ok: false, error: 'orderId kosong' };

  const booking = await dbGet(
    `
    SELECT order_id, user_id, item_type, payment_status,
           ticket_product_id, ticket_variant_id, ticket_qty, vendor_user_id,
           start_date
    FROM bookings
    WHERE order_id = ?
    LIMIT 1
    `,
    [order]
  ).catch(() => null);

  if (!booking) return { ok: false, error: 'booking tidak ditemukan' };
  if (String(booking.item_type || '').toLowerCase() !== 'ticket') return { ok: true, skipped: true };
  if (String(booking.payment_status || '').toLowerCase() !== 'paid') return { ok: true, skipped: true };

  const productId = parseInt(booking.ticket_product_id, 10);
  const variantId = parseInt(booking.ticket_variant_id, 10);
  const qty = Math.max(1, Math.min(50, parseInt(booking.ticket_qty, 10) || 1));
  const visitDate = ymdFromAny(booking.start_date);

  if (!productId || !variantId || !visitDate) {
    return { ok: false, error: 'metadata ticket booking tidak lengkap' };
  }

  const existing = await dbGet(`SELECT COUNT(*) as c FROM ticket_vouchers WHERE order_id = ?`, [order]).catch(() => ({ c: 0 }));
  const have = parseInt(existing?.c, 10) || 0;
  const missing = Math.max(0, qty - have);
  if (missing === 0) return { ok: true, issued: 0, already: true };

  await dbRun('BEGIN IMMEDIATE');
  try {
    // re-check in transaction
    const locked = await dbGet(`SELECT COUNT(*) as c FROM ticket_vouchers WHERE order_id = ?`, [order]).catch(() => ({ c: 0 }));
    const have2 = parseInt(locked?.c, 10) || 0;
    const missing2 = Math.max(0, qty - have2);
    if (missing2 === 0) {
      await dbRun('COMMIT');
      return { ok: true, issued: 0, already: true };
    }

    let issued = 0;
    for (let i = 0; i < missing2; i += 1) {
      // try a few times to avoid rare code collision
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const code = buildVoucherCode();
        try {
          await dbRun(
            `
            INSERT INTO ticket_vouchers
              (voucher_code, order_id, user_id, vendor_id, product_id, variant_id, visit_date, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
            `,
            [code, order, booking.user_id, booking.vendor_user_id || null, productId, variantId, visitDate]
          );
          issued += 1;
          break;
        } catch (e) {
          if (String(e?.message || '').includes('UNIQUE')) continue;
          throw e;
        }
      }
    }

    await dbRun('COMMIT');
    return { ok: true, issued };
  } catch (e) {
    try { await dbRun('ROLLBACK'); } catch {}
    return { ok: false, error: e?.message || String(e) };
  }
};

const lookupVoucherByCode = async ({ code, vendorId = null }) => {
  const c = String(code || '').trim();
  if (!c) return null;
  const params = [c];
  const where = [`tv.voucher_code = ?`];
  if (vendorId) {
    where.push(`tv.vendor_id = ?`);
    params.push(String(vendorId));
  }

  const row = await dbGet(
    `
    SELECT tv.id, tv.voucher_code, tv.order_id, tv.user_id, tv.vendor_id, tv.product_id, tv.variant_id,
           tv.visit_date, tv.status, tv.used_at, tv.used_by_vendor_user_id, tv.created_at,
           p.title as product_title, p.city as product_city, p.category as product_category, p.venue_name, p.address,
           v.name as variant_name, v.price as variant_price
    FROM ticket_vouchers tv
    JOIN ticket_products p ON p.id = tv.product_id
    JOIN ticket_variants v ON v.id = tv.variant_id
    WHERE ${where.join(' AND ')}
    LIMIT 1
    `,
    params
  ).catch(() => null);

  return row || null;
};

const redeemVoucherByCode = async ({ code, vendorUserId, vendorId = null, notes = null }) => {
  const c = String(code || '').trim();
  if (!c) return { ok: false, error: 'kode kosong' };
  if (!vendorUserId) return { ok: false, error: 'vendorUserId kosong' };

  await dbRun('BEGIN IMMEDIATE');
  try {
    const voucher = await lookupVoucherByCode({ code: c, vendorId });
    if (!voucher) {
      await dbRun('ROLLBACK');
      return { ok: false, error: 'voucher tidak ditemukan' };
    }

    if (String(voucher.status || '').toLowerCase() !== 'active') {
      await dbRun('ROLLBACK');
      return { ok: false, error: `voucher tidak aktif (${voucher.status})` };
    }

    // enforce visit_date == today (localtime)
    const today = await dbGet(`SELECT date('now','localtime') as d`).catch(() => null);
    const todayYmd = today?.d ? String(today.d) : null;
    if (todayYmd && String(voucher.visit_date) !== todayYmd) {
      await dbRun('ROLLBACK');
      return { ok: false, error: `voucher hanya berlaku pada ${voucher.visit_date}` };
    }

    const upd = await dbRun(
      `
      UPDATE ticket_vouchers
      SET status = 'used',
          used_at = datetime('now'),
          used_by_vendor_user_id = ?
      WHERE id = ? AND status = 'active'
      `,
      [String(vendorUserId), voucher.id]
    );

    if (!upd || upd.changes === 0) {
      await dbRun('ROLLBACK');
      return { ok: false, error: 'voucher sudah dipakai' };
    }

    await dbRun(
      `INSERT INTO ticket_redemptions (voucher_id, vendor_id, vendor_user_id, notes) VALUES (?, ?, ?, ?)`,
      [voucher.id, voucher.vendor_id || null, String(vendorUserId), notes ? String(notes).slice(0, 500) : null]
    );

    await dbRun('COMMIT');
    const after = await lookupVoucherByCode({ code: c, vendorId });
    return { ok: true, voucher: after };
  } catch (e) {
    try { await dbRun('ROLLBACK'); } catch {}
    return { ok: false, error: e?.message || String(e) };
  }
};

module.exports = {
  issueTicketVouchersForOrder,
  lookupVoucherByCode,
  redeemVoucherByCode,
  ymdFromAny,
};

