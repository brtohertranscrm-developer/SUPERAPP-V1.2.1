/**
 * SEED DATA — Finance Module Brothers Trans
 * ==========================================
 * Jalankan SETELAH server sudah pernah start minimal sekali
 * (agar tabel baru dari db.js sudah terbuat)
 *
 * Cara pakai:
 *   cd BACKEND
 *   node seed_finance.js
 *
 * Yang di-insert:
 *   - 1 user vendor mitra (role: user, vendor_rate: 20%)
 *   - Update 2 motor pertama agar punya vendor_user_id
 *   - 8 data pengeluaran operasional (berbagai kategori & bulan)
 *   - 5 data rekonsiliasi pembayaran (mixed status)
 *   - Booking sample dengan status completed (untuk laporan)
 */

const db = require('./db');
const { randomUUID: uuidv4 } = require('crypto'); // bawaan Node.js, tidak perlu install

// Tunggu DB selesai initialize
setTimeout(async () => {
  console.log('\n🌱 Memulai seed data Finance Module...\n');

  const dbGet = (sql, params = []) => new Promise((resolve, reject) =>
    db.get(sql, params, (err, row) => err ? reject(err) : resolve(row))
  );
  const dbAll = (sql, params = []) => new Promise((resolve, reject) =>
    db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows || []))
  );
  const dbRun = (sql, params = []) => new Promise((resolve, reject) =>
    db.run(sql, params, function(err) { err ? reject(err) : resolve({ lastID: this.lastID, changes: this.changes }); })
  );

  try {
    // ==========================================
    // 1. BUAT USER VENDOR (mitra pemilik armada)
    // ==========================================
    const vendorId = uuidv4();
    const existingVendor = await dbGet("SELECT id FROM users WHERE email = 'vendor.budi@brotherstrans.test'");

    let actualVendorId = existingVendor?.id;

    if (!existingVendor) {
      await dbRun(
        `INSERT INTO users (id, name, email, password, phone, role, kyc_status, miles, join_date, bank_name, bank_account)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          vendorId,
          'Budi Santoso (Vendor)',
          'vendor.budi@brotherstrans.test',
          '$2b$10$placeholder_hash',   // password tidak penting untuk testing
          '08123456789',
          'user',
          'verified',
          0,
          new Date().toISOString(),
          'BCA',
          '1234567890'
        ]
      );
      actualVendorId = vendorId;
      console.log('✅ User vendor Budi Santoso dibuat — ID:', actualVendorId);
    } else {
      // Update bank info jika sudah ada
      await dbRun(
        `UPDATE users SET bank_name = 'BCA', bank_account = '1234567890' WHERE id = ?`,
        [actualVendorId]
      );
      console.log('ℹ️  User vendor sudah ada, bank info diupdate — ID:', actualVendorId);
    }

    // ==========================================
    // 2. UPDATE 2 MOTOR PERTAMA JADI ARMADA VENDOR
    // ==========================================
    const motors = await dbAll('SELECT id, name FROM motors LIMIT 2');
    if (motors.length > 0) {
      for (const motor of motors) {
        await dbRun(
          `UPDATE motors SET vendor_user_id = ?, vendor_rate = 0.20 WHERE id = ?`,
          [actualVendorId, motor.id]
        );
        console.log(`✅ Motor "${motor.name}" (ID: ${motor.id}) → vendor Budi, rate 20%`);
      }
    } else {
      console.log('⚠️  Tidak ada motor di database. Jalankan seed.js dulu.');
    }

    // ==========================================
    // 3. CARI ADMIN USER UNTUK created_by
    // ==========================================
    const adminUser = await dbGet("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
    const createdBy = adminUser?.id || actualVendorId;

    // ==========================================
    // 4. INSERT PENGELUARAN OPERASIONAL
    // ==========================================
    const today = new Date();
    const thisMonth = today.toISOString().slice(0, 7); // YYYY-MM
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().slice(0, 7);

    const expenses = [
      { category: 'servis',    amount: 250000,  description: 'Ganti oli + filter Honda Vario — unit AB 1234 XY',   date: `${thisMonth}-05` },
      { category: 'servis',    amount: 350000,  description: 'Tune up Yamaha NMAX — unit AB 5678 ZZ',              date: `${thisMonth}-08` },
      { category: 'bbm',       amount: 120000,  description: 'Isi BBM armada operasional harian',                   date: `${thisMonth}-10` },
      { category: 'bbm',       amount: 95000,   description: 'Bensin operasional minggu ke-2',                     date: `${thisMonth}-15` },
      { category: 'marketing', amount: 500000,  description: 'Boost Instagram + TikTok ads Mei',                   date: `${thisMonth}-01` },
      { category: 'gaji',      amount: 1500000, description: 'Honorarium karyawan parkir & kebersihan bulan ini',  date: `${thisMonth}-01` },
      { category: 'sewa',      amount: 800000,  description: 'Sewa garasi bulanan Jl. Parangtritis',               date: `${lastMonth}-01` },
      { category: 'lainnya',   amount: 75000,   description: 'Biaya admin bank transfer bulanan',                  date: `${lastMonth}-28` }
    ];

    for (const exp of expenses) {
      await dbRun(
        `INSERT INTO expenses (category, amount, description, expense_date, created_by) VALUES (?, ?, ?, ?, ?)`,
        [exp.category, exp.amount, exp.description, exp.date, createdBy]
      );
    }
    console.log(`✅ ${expenses.length} data pengeluaran berhasil di-insert`);

    // ==========================================
    // 5. CARI BOOKING YANG ADA UNTUK REKONSILIASI
    // ==========================================
    const bookings = await dbAll(
      `SELECT order_id, total_price, user_id FROM bookings ORDER BY created_at DESC LIMIT 5`
    );

    if (bookings.length === 0) {
      console.log('⚠️  Tidak ada booking. Jalankan seed.js dulu, lalu buat beberapa booking via frontend.');
    } else {
      // ==========================================
      // 6. INSERT DATA REKONSILIASI
      // ==========================================
      const reconStatuses = ['matched', 'pending', 'pending', 'rejected'];

      for (let i = 0; i < Math.min(bookings.length, 4); i++) {
        const bk = bookings[i];
        const status = reconStatuses[i] || 'pending';
        const isMatched = status === 'matched';
        const isRejected = status === 'rejected';

        // Variasi nominal: 1x tepat, 1x lebih, 2x pending
        const nominalVariants = [bk.total_price, Math.floor(bk.total_price * 1.1), bk.total_price, bk.total_price];
        const banks = ['bca', 'mandiri', 'bca', 'qris'];

        await dbRun(
          `INSERT INTO payment_reconciliations
           (order_id, bank_name, transfer_amount, transfer_date, status, notes, reconciled_by, reconciled_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            bk.order_id,
            banks[i],
            nominalVariants[i],
            new Date(today.getTime() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status,
            isRejected ? 'Nominal tidak sesuai, harap transfer ulang.' : null,
            (isMatched || isRejected) ? createdBy : null,
            (isMatched || isRejected) ? new Date().toISOString() : null
          ]
        );

        // Jika matched → update booking.payment_status = paid
        if (isMatched) {
          await dbRun(`UPDATE bookings SET payment_status = 'paid' WHERE order_id = ?`, [bk.order_id]);
        }
      }

      console.log(`✅ ${Math.min(bookings.length, 4)} data rekonsiliasi berhasil di-insert`);
      console.log('   Status: 1 matched, 2 pending, 1 rejected');
    }

    // ==========================================
    // 7. VERIFIKASI HASIL SEED
    // ==========================================
    console.log('\n📊 Verifikasi data setelah seed:');

    const expCount  = await dbGet('SELECT COUNT(*) as c FROM expenses');
    const reconCount = await dbGet('SELECT COUNT(*) as c FROM payment_reconciliations');
    const vendorCount = await dbGet("SELECT COUNT(*) as c FROM motors WHERE vendor_user_id IS NOT NULL");
    const pendingRecon = await dbGet("SELECT COUNT(*) as c FROM payment_reconciliations WHERE status = 'pending'");

    console.log(`   expenses             : ${expCount.c} rows`);
    console.log(`   payment_reconciliations: ${reconCount.c} rows (${pendingRecon.c} pending)`);
    console.log(`   motors dengan vendor   : ${vendorCount.c} unit`);

    console.log('\n🎉 Seed finance berhasil! Restart server lalu buka /admin/finance\n');

  } catch (err) {
    console.error('\n❌ Seed gagal:', err.message);
    console.error(err.stack);
  } finally {
    db.close();
  }

}, 1500); // tunggu db.serialize() selesai
