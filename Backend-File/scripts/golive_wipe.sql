-- Brother Trans — Go-Live Wipe (transaksi + customer)
-- Tujuan: kosongkan data transaksi & user role=customer ("user") tanpa menghapus master armada.
-- Aman untuk dijalankan berkali-kali (idempotent).
--
-- Disarankan jalankan via script `golive_wipe.sh` agar otomatis backup DB + wal checkpoint.

PRAGMA foreign_keys = OFF;
BEGIN;

-- =========================
-- 1) DATA TRANSAKSI
-- =========================
DELETE FROM booking_motor_addons;
DELETE FROM bookings;

-- Turunan operasional yang bersumber dari booking
DELETE FROM logistics_task_events;
DELETE FROM logistics_tasks;

-- Bukti transfer / rekonsiliasi pembayaran
DELETE FROM payment_reconciliations;

-- Promo usage / klaim user
DELETE FROM promo_usage;
DELETE FROM user_promotions;

-- Referral / komisi / loyalty
DELETE FROM referral_logs;
DELETE FROM miles_vouchers;
DELETE FROM miles_ledger;

-- Bantuan & request manual
DELETE FROM support_tickets;
DELETE FROM custom_order_requests;

-- Review mission (bukti review google)
DELETE FROM gmaps_reviews;

-- =========================
-- 2) DATA LOGIN / OTP
-- =========================
DELETE FROM login_logs;
DELETE FROM email_otps;
DELETE FROM token_blacklist;

-- =========================
-- 3) DATA USER CUSTOMER
-- =========================
-- Tetap mempertahankan admin/subadmin/vendor (role != 'user')
DELETE FROM users WHERE COALESCE(role, 'user') = 'user';

-- =========================
-- 4) RESET STATE UNIT
-- =========================
UPDATE motor_units SET status = 'RDY';
UPDATE car_units   SET status = 'RDY';

-- Jika sebelumnya ada block jadwal testing (optional, tapi biasanya perlu dibersihkan saat go-live)
DELETE FROM unit_blocks;
DELETE FROM car_unit_blocks;

-- Reset usage promo (biar kuota/usage bersih)
UPDATE promotions SET current_usage = 0;

COMMIT;
PRAGMA foreign_keys = ON;

-- Catatan:
-- - Master data armada yang dipertahankan: motors, motor_units, cars, car_units, lockers, addons, pricing, dll.
-- - Jika kamu juga ingin bersihkan log admin/keuangan, lakukan manual (tidak otomatis demi keamanan).

