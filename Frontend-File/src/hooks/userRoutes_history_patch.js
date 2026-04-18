// ─── TAMBAHKAN ROUTE INI KE userRoutes.js ─────────────────────────────────────
// Letakkan di bawah route yang sudah ada, sebelum module.exports
// File: Backend-File/routes/userRoutes.js

// ==========================================
// 9. RIWAYAT BOOKING USER (Trip History)
// ==========================================
router.get('/users/history', async (req, res) => {
  try {
    const userId = req.user.id;

    const rows = await dbAll(
      `SELECT 
        order_id, item_type, item_name, location,
        start_date, end_date, total_price,
        status, payment_status, created_at
       FROM bookings
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /users/history error:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengambil riwayat perjalanan.' });
  }
});
