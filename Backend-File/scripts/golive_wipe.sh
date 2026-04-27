#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
DEFAULT_DB_PATH="${SCRIPT_DIR}/../brother_trans.db"
SQL_PATH="${SCRIPT_DIR}/golive_wipe.sql"

usage() {
  cat <<'EOF'
Usage:
  ./Backend-File/scripts/golive_wipe.sh [db_path] [--yes]

Contoh:
  ./Backend-File/scripts/golive_wipe.sh
  ./Backend-File/scripts/golive_wipe.sh /var/www/brother-backend/Backend-File/brother_trans.db --yes

Catatan:
  - Script ini akan membuat backup DB (file .db) sebelum wipe.
  - Script ini menghapus transaksi + user role "user" (customer), tapi mempertahankan master armada.
EOF
}

DB_PATH="${1:-$DEFAULT_DB_PATH}"
YES_FLAG="${2:-}"

if [[ "${DB_PATH}" == "-h" || "${DB_PATH}" == "--help" ]]; then
  usage
  exit 0
fi

if [[ ! -f "${DB_PATH}" ]]; then
  echo "ERROR: DB tidak ditemukan: ${DB_PATH}" >&2
  exit 1
fi

if [[ ! -f "${SQL_PATH}" ]]; then
  echo "ERROR: SQL file tidak ditemukan: ${SQL_PATH}" >&2
  exit 1
fi

echo "DB      : ${DB_PATH}"
echo "SQL     : ${SQL_PATH}"

if [[ "${YES_FLAG}" != "--yes" ]]; then
  echo
  read -r -p "Yakin mau wipe TRANSAKSI + USER CUSTOMER (role=user)? Ketik 'WIPE' untuk lanjut: " CONFIRM
  if [[ "${CONFIRM}" != "WIPE" ]]; then
    echo "Batal."
    exit 0
  fi
fi

echo
echo "1) WAL checkpoint..."
sqlite3 "${DB_PATH}" "PRAGMA wal_checkpoint(FULL);" >/dev/null || true

echo "2) Backup DB..."
TS="$(date +%F_%H%M%S)"
BACKUP_PATH="$(dirname -- "${DB_PATH}")/brother_trans_backup_${TS}.db"
cp -f "${DB_PATH}" "${BACKUP_PATH}"
echo "   Backup: ${BACKUP_PATH}"

echo "3) Wipe data..."
sqlite3 "${DB_PATH}" < "${SQL_PATH}"

echo "4) Ringkasan counts..."
sqlite3 "${DB_PATH}" <<'SQL'
.mode column
.headers on
SELECT 'users' AS tbl, COUNT(*) AS count FROM users;
SELECT 'bookings' AS tbl, COUNT(*) AS count FROM bookings;
SELECT 'payment_reconciliations' AS tbl, COUNT(*) AS count FROM payment_reconciliations;
SQL

echo
echo "Selesai."
