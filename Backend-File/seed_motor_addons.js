const db = require('./db');

// Helper promisify
const dbGet = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
});
const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function(err) { err ? reject(err) : resolve(this); });
});

const seedMotorAddons = async () => {
  try {
    const existing = await dbGet(`SELECT COUNT(*) as c FROM motor_addons`);
    if ((existing?.c || 0) > 0) {
      console.log('✅ motor_addons sudah ada isinya. Seed dilewati.');
      return;
    }

    console.log('🌱 Seeding motor add-ons & paket...');

    const rows = [
      // Packages (upsell besar)
      { name: 'Paket Wisata Kota (Half Day)', description: 'Rute rekomendasi + titik foto. Tanpa guide.', price: 35000, addon_type: 'package', allow_quantity: 0, max_qty: 1, sort_order: 10 },
      { name: 'Paket Wisata Kota (Full Day)', description: 'Rute rekomendasi seharian + hidden gems. Tanpa guide.', price: 60000, addon_type: 'package', allow_quantity: 0, max_qty: 1, sort_order: 20 },

      // Add-ons kecil (attach rate tinggi)
      { name: 'Holder HP', description: 'Mount HP untuk navigasi.', price: 10000, addon_type: 'addon', allow_quantity: 0, max_qty: 1, sort_order: 110 },
      { name: 'Jas Hujan', description: 'Jas hujan sekali pakai/standar.', price: 10000, addon_type: 'addon', allow_quantity: 1, max_qty: 2, sort_order: 120 },
      { name: 'Helm Tambahan', description: 'Helm tambahan di luar default.', price: 15000, addon_type: 'addon', allow_quantity: 1, max_qty: 2, sort_order: 130 },
    ];

    for (const r of rows) {
      await dbRun(
        `INSERT INTO motor_addons (name, description, price, addon_type, allow_quantity, max_qty, sort_order, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          r.name,
          r.description || null,
          parseInt(r.price, 10) || 0,
          r.addon_type,
          r.allow_quantity ? 1 : 0,
          parseInt(r.max_qty, 10) || 1,
          parseInt(r.sort_order, 10) || 0,
        ]
      );
    }

    console.log('✅ Seed motor add-ons selesai.');
  } catch (err) {
    console.error('❌ Seed motor add-ons gagal:', err.message);
  } finally {
    db.close();
  }
};

seedMotorAddons();

