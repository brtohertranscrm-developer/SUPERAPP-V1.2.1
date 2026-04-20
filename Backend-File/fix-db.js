const db = require('./db'); // pastikan path ke db.js sesuai

db.run("ALTER TABLE motors ADD COLUMN cc INTEGER DEFAULT 125;", (err) => {
  if (err) {
    console.error("Gagal menambahkan kolom:", err.message);
  } else {
    console.log("Mantap! Kolom 'cc' berhasil ditambahkan ke tabel motors.");
  }
});