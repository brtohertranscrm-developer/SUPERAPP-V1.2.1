const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const db = require('./db');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const ADMIN_ID = process.env.ADMIN_ID || `ADM-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
const ADMIN_NAME = process.env.ADMIN_NAME || 'Super Admin';
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@brothertrans.com').toLowerCase().trim();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const ADMIN_PHONE = process.env.ADMIN_PHONE || '08123456789';
const ADMIN_ROLE = process.env.ADMIN_ROLE || 'superadmin';
const ADMIN_PERMISSIONS = process.env.ADMIN_PERMISSIONS || '[]';

const dbGet = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
});

const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function runCallback(err) {
    if (err) return reject(err);
    return resolve({ lastID: this.lastID, changes: this.changes });
  });
});

const seedAdmin = async () => {
  try {
    console.log('⏳ Menyiapkan akun admin...');

    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
    const existingUser = await dbGet('SELECT id, email, role FROM users WHERE email = ?', [ADMIN_EMAIL]);

    if (existingUser) {
      await dbRun(
        `UPDATE users
         SET name = ?, password = ?, phone = ?, role = ?, permissions = ?, kyc_status = 'approved',
             login_attempts = 0, locked_until = NULL
         WHERE email = ?`,
        [ADMIN_NAME, hashedPassword, ADMIN_PHONE, ADMIN_ROLE, ADMIN_PERMISSIONS, ADMIN_EMAIL]
      );

      console.log('✅ Akun admin existing berhasil diperbarui.');
      console.log(`   ID       : ${existingUser.id}`);
    } else {
      await dbRun(
        `INSERT INTO users (
           id, name, email, password, phone, role, permissions, kyc_status, join_date
         ) VALUES (?, ?, ?, ?, ?, ?, ?, 'approved', ?)`,
        [ADMIN_ID, ADMIN_NAME, ADMIN_EMAIL, hashedPassword, ADMIN_PHONE, ADMIN_ROLE, ADMIN_PERMISSIONS, new Date().toISOString()]
      );

      console.log('✅ Akun admin baru berhasil dibuat.');
      console.log(`   ID       : ${ADMIN_ID}`);
    }

    console.log(`   Nama     : ${ADMIN_NAME}`);
    console.log(`   Email    : ${ADMIN_EMAIL}`);
    console.log(`   Password : ${ADMIN_PASSWORD}`);
    console.log(`   Role     : ${ADMIN_ROLE}`);
    console.log('\nSilakan login dengan akun admin di atas.');
  } catch (err) {
    console.error('❌ Gagal membuat/memperbarui admin:', err.message);
    process.exitCode = 1;
  } finally {
    db.close();
  }
};

seedAdmin();
