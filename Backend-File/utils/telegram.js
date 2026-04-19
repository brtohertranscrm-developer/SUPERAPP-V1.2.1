'use strict';

/**
 * TELEGRAM NOTIFICATION UTILITY — Brothers Trans
 * ================================================
 * Fire-and-forget: jika Telegram down, proses bisnis tetap jalan normal.
 *
 * 4 trigger aktif:
 *   1. notifyNewBooking()       — booking baru motor/loker
 *   2. notifyExtendBooking()    — user perpanjang sewa
 *   3. notifyKycPending()       — user submit verifikasi KYC
 *   4. notifyPaymentConfirmed() — admin konfirmasi rekonsiliasi transfer
 *
 * Tambahkan 3 baris ini ke .env:
 *   TELEGRAM_BOT_TOKEN=token_dari_botfather
 *   TELEGRAM_CHAT_ID=-1001234567890
 *   ADMIN_URL=https://yourdomain.com
 */

const https = require('https');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID   = process.env.TELEGRAM_CHAT_ID;
const ADMIN_URL = process.env.ADMIN_URL || 'http://localhost:5173/admin';

if (!BOT_TOKEN || !CHAT_ID) {
  console.warn('⚠️  Telegram: TELEGRAM_BOT_TOKEN atau TELEGRAM_CHAT_ID belum di-set di .env');
  console.warn('   Notifikasi Telegram dinonaktifkan sampai .env dilengkapi.');
}

const isEnabled = () => !!(BOT_TOKEN && CHAT_ID);

// ─── Core: kirim request ke Telegram API ─────────────────────────────────────
const sendMessage = (payload) => new Promise((resolve) => {
  if (!isEnabled()) return resolve(null);

  const body    = JSON.stringify(payload);
  const options = {
    hostname: 'api.telegram.org',
    path:     `/bot${BOT_TOKEN}/sendMessage`,
    method:   'POST',
    headers:  {
      'Content-Type':   'application/json',
      'Content-Length': Buffer.byteLength(body),
    },
    timeout: 8000,
  };

  const req = https.request(options, (res) => {
    let raw = '';
    res.on('data', (c) => { raw += c; });
    res.on('end', () => {
      try {
        const r = JSON.parse(raw);
        if (!r.ok) console.error('⚠️  Telegram API error:', r.description);
      } catch (_) {}
      resolve(null);
    });
  });

  req.on('error',   (e) => { console.error('⚠️  Telegram error (tidak pengaruhi proses utama):', e.message); resolve(null); });
  req.on('timeout', ()  => { console.error('⚠️  Telegram timeout (tidak pengaruhi proses utama)'); req.destroy(); resolve(null); });
  req.write(body);
  req.end();
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtRp   = (n) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;
const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  : '—';
const fmtTime = () =>
  new Date().toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }) + ' WIB';

// Escape karakter khusus MarkdownV2 Telegram — wajib untuk semua string dinamis
const esc = (s) => String(s || '—').replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');

// Bungkus send agar caller tidak perlu try/catch
const notify = (payload) =>
  sendMessage(payload).catch((e) => console.error('Telegram notify failed:', e.message));


// ═══════════════════════════════════════════════════════════════════════════════
// 1. BOOKING BARU
// ═══════════════════════════════════════════════════════════════════════════════
const notifyNewBooking = (booking, user) => {
  const emoji     = booking?.item_type === 'motor' ? '🏍️' : '📦';
  const typeLabel = booking?.item_type === 'motor' ? 'Motor' : 'Loker';

  return notify({
    chat_id:    CHAT_ID,
    parse_mode: 'MarkdownV2',
    disable_web_page_preview: true,
    text: [
      `${emoji} *PESANAN BARU — ${esc(typeLabel)}*`,
      ``,
      `🔖 Order: \`${esc(booking?.order_id)}\``,
      `👤 Pelanggan: ${esc(user?.name)}`,
      `📱 WA: ${esc(user?.phone)}`,
      `🛵 Item: ${esc(booking?.item_name)}`,
      `📍 Lokasi: ${esc(booking?.location)}`,
      ``,
      `📅 ${esc(fmtDate(booking?.start_date))} → ${esc(fmtDate(booking?.end_date))}`,
      `💰 Total: *${esc(fmtRp(booking?.total_price))}*`,
      `💳 Metode: ${esc(booking?.payment_method || 'transfer')}`,
      ``,
      `⏰ ${esc(fmtTime())}`,
      `👉 [Buka Dashboard](${ADMIN_URL}/booking)`,
    ].join('\n'),
  });
};


// ═══════════════════════════════════════════════════════════════════════════════
// 2. EXTEND BOOKING
// ═══════════════════════════════════════════════════════════════════════════════
const notifyExtendBooking = (booking, user, newEndDate, extraCost) => notify({
  chat_id:    CHAT_ID,
  parse_mode: 'MarkdownV2',
  disable_web_page_preview: true,
  text: [
    `🔄 *EXTEND BOOKING*`,
    ``,
    `🔖 Order: \`${esc(booking?.order_id)}\``,
    `👤 Pelanggan: ${esc(user?.name)}`,
    `📱 WA: ${esc(user?.phone)}`,
    `🛵 Item: ${esc(booking?.item_name)}`,
    ``,
    `📅 Selesai baru: *${esc(fmtDate(newEndDate))}*`,
    `💰 Biaya tambahan: *${esc(fmtRp(extraCost))}*`,
    `⚠️ Status bayar: UNPAID \\(perlu konfirmasi transfer\\)`,
    ``,
    `⏰ ${esc(fmtTime())}`,
    `👉 [Buka Dashboard](${ADMIN_URL}/booking)`,
  ].join('\n'),
});


// ═══════════════════════════════════════════════════════════════════════════════
// 3. KYC PENDING
// ═══════════════════════════════════════════════════════════════════════════════
const notifyKycPending = (user) => {
  const phone = String(user?.phone || '').replace(/\D/g, '').replace(/^0/, '62');

  return notify({
    chat_id:    CHAT_ID,
    parse_mode: 'MarkdownV2',
    disable_web_page_preview: true,
    text: [
      `🪪 *KYC BARU — PERLU VERIFIKASI*`,
      ``,
      `👤 Nama: ${esc(user?.name)}`,
      `📧 Email: ${esc(user?.email)}`,
      `📱 WA: ${esc(user?.phone)}`,
      ``,
      `📋 *Langkah admin:*`,
      `1\\. Hubungi pelanggan via WA`,
      `2\\. Minta foto KTP \\+ selfie`,
      `3\\. Generate kode KYC di dashboard`,
      `4\\. Kirim kode ke pelanggan`,
      ``,
      `⏰ ${esc(fmtTime())}`,
      `👉 [Chat WA Pelanggan](https://wa.me/${phone})`,
      `👉 [Menu KYC Admin](${ADMIN_URL}/users)`,
    ].join('\n'),
  });
};


// ═══════════════════════════════════════════════════════════════════════════════
// 4. PEMBAYARAN DIKONFIRMASI
// ═══════════════════════════════════════════════════════════════════════════════
const notifyPaymentConfirmed = (recon, booking, adminName) => {
  const BANK_LABELS = {
    bca:     'BCA',
    mandiri: 'Mandiri',
    bri:     'BRI',
    bni:     'BNI',
    qris:    'QRIS / E\\-Wallet',
    cash:    'Cash',
  };
  const bankLabel = BANK_LABELS[recon?.bank_name] || esc(recon?.bank_name);

  return notify({
    chat_id:    CHAT_ID,
    parse_mode: 'MarkdownV2',
    disable_web_page_preview: true,
    text: [
      `✅ *PEMBAYARAN DIKONFIRMASI*`,
      ``,
      `🔖 Order: \`${esc(recon?.order_id)}\``,
      `👤 Pelanggan: ${esc(booking?.customer_name)}`,
      `📱 WA: ${esc(booking?.customer_phone)}`,
      `🛵 Item: ${esc(booking?.item_name)}`,
      ``,
      `🏦 Bank: ${bankLabel}`,
      `💰 Nominal transfer: *${esc(fmtRp(recon?.transfer_amount))}*`,
      `💳 Total booking: ${esc(fmtRp(booking?.total_price))}`,
      `📅 Tgl transfer: ${esc(fmtDate(recon?.transfer_date))}`,
      ``,
      `👤 Dikonfirmasi oleh: *${esc(adminName)}*`,
      `⏰ ${esc(fmtTime())}`,
      `👉 [Buka Finance](${ADMIN_URL}/finance)`,
    ].join('\n'),
  });
};


// ═══════════════════════════════════════════════════════════════════════════════
// TEST KONEKSI — otomatis dipanggil saat server start (lihat server.js)
// ═══════════════════════════════════════════════════════════════════════════════
const testConnection = async () => {
  if (!isEnabled()) return;
  await notify({
    chat_id:    CHAT_ID,
    parse_mode: 'MarkdownV2',
    text:       `🚀 *Brother Trans server started*\n\nNotifikasi Telegram aktif ✓\n⏰ ${esc(fmtTime())}`,
  });
  console.log('✅ Telegram: koneksi berhasil, notifikasi aktif.');
};



// =====================================================================
// 5. REVIEW GOOGLE MAPS
// =====================================================================
const notifyGmapsReview = function(review, user) {
  var lines = [
    '*SUBMISSION REVIEW GOOGLE MAPS*',
    '',
    'Nama: ' + esc(user && user.name ? user.name : '-'),
    'WA: ' + esc(user && user.phone ? user.phone : '-'),
    'Order: ' + esc(review && review.order_id ? review.order_id : '-'),
    '',
    'Waktu: ' + esc(fmtTime()),
    '[Verifikasi Dashboard](' + (ADMIN_URL || '') + '/reviews)',
  ];
  if (review && review.screenshot_url) {
    lines.push('[Lihat Screenshot](' + review.screenshot_url + ')');
  }
  return notify({
    chat_id: CHAT_ID,
    parse_mode: 'MarkdownV2',
    disable_web_page_preview: true,
    text: lines.filter(Boolean).join('\n'),
  });
};

module.exports = {
  notifyNewBooking,
  notifyExtendBooking,
  notifyKycPending,
  notifyPaymentConfirmed,
  testConnection,
  isEnabled,
  notifyGmapsReview,
};
