// ═══════════════════════════════════════════════════════════════════════════════
// BACKEND PATCH — Update lokasi motor di database
// Jalankan query ini SEKALI di SQLite untuk update data yang sudah ada
// ═══════════════════════════════════════════════════════════════════════════════

// Buka file db.js atau buat script migrate.js lalu jalankan:
// node migrate.js

const sqlite3 = require('sqlite3').verbose();
const path    = require('path');

const db = new sqlite3.Database(
  path.resolve(__dirname, 'brother_trans.db'),
  (err) => { if (err) { console.error(err); process.exit(1); } }
);

db.serialize(() => {
  // Update semua varian Yogyakarta/Lempuyangan/Tugu → 'Yogyakarta'
  db.run(
    `UPDATE motors SET location = 'Yogyakarta'
     WHERE location IN ('Lempuyangan', 'Stasiun Lempuyangan', 'Tugu', 'Tugu / Malioboro', 'Yogyakarta')`,
    (err) => { if (err) console.error('Update Yogyakarta error:', err); else console.log('✅ Motor Yogyakarta updated'); }
  );

  // Update semua varian Solo/Balapan → 'Solo'
  db.run(
    `UPDATE motors SET location = 'Solo'
     WHERE location IN ('Balapan Solo', 'Stasiun Balapan Solo', 'Stasiun Solo Balapan', 'Solo Balapan', 'Solo')`,
    (err) => { if (err) console.error('Update Solo error:', err); else console.log('✅ Motor Solo updated'); }
  );

  // Update tabel bookings juga (field location)
  db.run(
    `UPDATE bookings SET location = 'Yogyakarta'
     WHERE location IN ('Lempuyangan', 'Stasiun Lempuyangan', 'Tugu', 'Tugu / Malioboro')`,
    (err) => { if (err) console.error('Update bookings Yogyakarta error:', err); else console.log('✅ Bookings Yogyakarta updated'); }
  );

  db.run(
    `UPDATE bookings SET location = 'Solo'
     WHERE location IN ('Balapan Solo', 'Stasiun Balapan Solo', 'Stasiun Solo Balapan', 'Solo Balapan')`,
    (err) => { if (err) console.error('Update bookings Solo error:', err); else console.log('✅ Bookings Solo updated'); }
  );
});

db.close(() => console.log('✅ Migrasi selesai.'));


// ═══════════════════════════════════════════════════════════════════════════════
// FRONTEND PATCH — ArmadaModal.jsx
// Ubah option location di form tambah/edit motor
// File: src/components/admin/armada/ArmadaModal.jsx
// ═══════════════════════════════════════════════════════════════════════════════

// SEBELUM:
// <option value="Lempuyangan">Lempuyangan</option>
// <option value="Tugu">Tugu / Malioboro</option>
// <option value="Balapan Solo">Balapan Solo</option>

// SESUDAH:
// <option value="Yogyakarta">Yogyakarta</option>
// <option value="Solo">Solo</option>

// Dan ubah default di useState:
// SEBELUM: location: 'Lempuyangan'
// SESUDAH: location: 'Yogyakarta'
