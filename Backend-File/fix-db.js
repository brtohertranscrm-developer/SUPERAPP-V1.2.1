const db = require('./db');

db.all('PRAGMA table_info(motors)', (err, columns) => {
  if (err) {
    console.error('Gagal membaca struktur tabel motors:', err.message);
    db.close();
    return;
  }

  const hasCcColumn = (columns || []).some((column) => column.name === 'cc');

  if (hasCcColumn) {
    console.log("Kolom 'cc' sudah ada di tabel motors. Tidak perlu migrasi.");
    db.close();
    return;
  }

  db.run("ALTER TABLE motors ADD COLUMN cc TEXT DEFAULT '125'", (alterErr) => {
    if (alterErr) {
      console.error("Gagal menambahkan kolom 'cc':", alterErr.message);
    } else {
      console.log("Mantap! Kolom 'cc' berhasil ditambahkan ke tabel motors.");
    }
    db.close();
  });
});
