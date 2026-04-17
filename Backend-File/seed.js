const db = require('./db');
const bcrypt = require('bcrypt');

console.log('⏳ Memulai pengisian data awal (Seeding)...');

const adminPassword = bcrypt.hashSync('admin123', 10);
const userPassword = bcrypt.hashSync('user123', 10);

// Helper promisify
const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function(err) { err ? reject(err) : resolve(this); });
});

const seed = async () => {
  try {
    // ==========================================
    // 1. Data Motor (skip jika sudah ada)
    // ==========================================
    const motors = [
      ['Yamaha NMAX 155', 'Premium Matic', 100000, 5, 'https://images.unsplash.com/photo-1599819811279-d518ac6a4b16?q=80&w=600&auto=format&fit=crop'],
      ['Honda Vario 125', 'Standard Matic', 75000, 8, 'https://images.unsplash.com/photo-1625231334168-2506b98e04e9?q=80&w=600&auto=format&fit=crop'],
      ['Vespa Sprint 150', 'Lifestyle Matic', 150000, 2, 'https://images.unsplash.com/photo-1594046646545-2f5a519fc575?q=80&w=600&auto=format&fit=crop']
    ];

    for (const m of motors) {
      await dbRun(
        `INSERT OR IGNORE INTO motors (name, category, base_price, stock, image_url) 
         SELECT ?, ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM motors WHERE name = ?)`,
        [...m, m[0]]
      );
    }
    console.log('  ✅ Data motor OK');

    // ==========================================
    // 2. Data Loker (skip jika sudah ada)
    // ==========================================
    const lockers = [
      ['Garasi Pusat Malioboro', 'Medium', 25000, 10],
      ['Garasi Pusat Malioboro', 'Large', 40000, 5],
      ['Garasi Stasiun Balapan', 'Medium', 25000, 8]
    ];

    for (const l of lockers) {
      await dbRun(
        `INSERT OR IGNORE INTO lockers (location, size, base_price, stock) 
         SELECT ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM lockers WHERE location = ? AND size = ?)`,
        [...l, l[0], l[1]]
      );
    }
    console.log('  ✅ Data loker OK');

    // ==========================================
    // 3. Data User & Admin (skip jika email sudah ada)
    // ==========================================
    const users = [
      ['U-001', 'Pandu Admin', 'admin@brothertrans.com', adminPassword, '08123456789', 'superadmin', 'approved'],
      ['U-002', 'Pelanggan Setia', 'user@gmail.com', userPassword, '08556677889', 'user', 'pending']
    ];

    for (const u of users) {
      await dbRun(
        `INSERT OR IGNORE INTO users (id, name, email, password, phone, role, join_date, kyc_status) 
         SELECT ?, ?, ?, ?, ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = ?)`,
        [...u.slice(0, 6), new Date().toISOString(), u[6], u[2]]
      );
    }
    console.log('  ✅ Data user OK');

    // ==========================================
    // 4. Default Surge Pricing Rule (skip jika sudah ada)
    // ==========================================
    await dbRun(
      `INSERT OR IGNORE INTO price_rules (rule_type, name, is_active, markup_percentage, stock_condition)
       SELECT 'surge', 'Surge Pricing', 0, 15, 2 
       WHERE NOT EXISTS (SELECT 1 FROM price_rules WHERE rule_type = 'surge')`
    );
    console.log('  ✅ Default pricing rule OK');

    console.log('\n🎉 Seeding selesai! Aman dijalankan berulang kali.');

  } catch (err) {
    console.error('❌ Seeding gagal:', err.message);
  }
};

seed();
