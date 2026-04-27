'use strict';

const express = require('express');
const router = express.Router();
const { verifyUser } = require('../middlewares/authMiddleware');
const { lookupVoucherByCode, redeemVoucherByCode } = require('../utils/ticketing');

router.use(verifyUser);

const canVendor = (role) => {
  const r = String(role || '').toLowerCase();
  return r === 'vendor' || r === 'admin' || r === 'superadmin';
};

const resolveVendorId = (req) => {
  const role = String(req.user?.role || '').toLowerCase();
  if (role === 'vendor') return String(req.user.id);
  // admin/superadmin can optionally scope by vendor_id for debugging
  const vendorId = req.query.vendor_id || req.body?.vendor_id || null;
  return vendorId ? String(vendorId) : null;
};

router.get('/vouchers/:code', async (req, res) => {
  try {
    if (!canVendor(req.user?.role)) {
      return res.status(403).json({ success: false, error: 'Akses ditolak.' });
    }

    const vendorId = resolveVendorId(req);
    const code = String(req.params.code || '').trim();
    const v = await lookupVoucherByCode({ code, vendorId });
    if (!v) return res.status(404).json({ success: false, error: 'Voucher tidak ditemukan.' });
    res.json({ success: true, data: v });
  } catch (e) {
    console.error('GET /vendor/tickets/vouchers/:code error:', e.message);
    res.status(500).json({ success: false, error: 'Gagal mencari voucher.' });
  }
});

router.post('/vouchers/:code/redeem', async (req, res) => {
  try {
    if (!canVendor(req.user?.role)) {
      return res.status(403).json({ success: false, error: 'Akses ditolak.' });
    }

    const vendorId = resolveVendorId(req);
    const code = String(req.params.code || '').trim();
    const notes = req.body?.notes || null;
    const r = await redeemVoucherByCode({ code, vendorUserId: req.user.id, vendorId, notes });
    if (!r.ok) return res.status(400).json({ success: false, error: r.error });
    res.json({ success: true, data: r.voucher });
  } catch (e) {
    console.error('POST /vendor/tickets/vouchers/:code/redeem error:', e.message);
    res.status(500).json({ success: false, error: 'Gagal redeem voucher.' });
  }
});

module.exports = router;

