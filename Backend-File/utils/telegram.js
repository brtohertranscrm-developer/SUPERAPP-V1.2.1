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

// Telegram Forum Topics (optional)
// If the group has Topics enabled, set these to route messages into separate threads.
const toThreadId = (v) => {
  const n = parseInt(String(v || '').trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const TOPICS = {
  log:     toThreadId(process.env.TELEGRAM_TOPIC_LOG),
  booking: toThreadId(process.env.TELEGRAM_TOPIC_BOOKING),
  payment: toThreadId(process.env.TELEGRAM_TOPIC_PAYMENT),
  kyc:     toThreadId(process.env.TELEGRAM_TOPIC_KYC),
  locker:  toThreadId(process.env.TELEGRAM_TOPIC_LOCKER),
  review:  toThreadId(process.env.TELEGRAM_TOPIC_REVIEW),
};

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

const bookingMeta = (booking) => {
  const t = String(booking?.item_type || '').toLowerCase();
  if (t === 'motor')  return { headerEmoji: '🏍️', typeLabel: 'Motor', itemEmoji: '🛵' };
  if (t === 'car')    return { headerEmoji: '🚗', typeLabel: 'Mobil', itemEmoji: '🚗' };
  if (t === 'locker') return { headerEmoji: '📦', typeLabel: 'Loker', itemEmoji: '📦' };
  return { headerEmoji: '🆕', typeLabel: 'Booking', itemEmoji: '🧾' };
};

// Bungkus send agar caller tidak perlu try/catch
const notify = (payload) =>
  sendMessage(payload).catch((e) => console.error('Telegram notify failed:', e.message));

const notifyTo = (topicKey, payload) => {
  const threadId = topicKey ? TOPICS[topicKey] : null;
  if (threadId) return notify({ ...payload, message_thread_id: threadId });
  return notify(payload);
};


// ═══════════════════════════════════════════════════════════════════════════════
// 1. BOOKING BARU
// ═══════════════════════════════════════════════════════════════════════════════
const notifyNewBooking = (booking, user) => {
  const meta = bookingMeta(booking);
  const extraLines = [];

  if (booking?.item_type === 'car' && booking?.plate_number) {
    extraLines.push(`🚘 Plat: *${esc(booking?.plate_number)}*`);
  }
  if ((booking?.item_type === 'motor' || booking?.item_type === 'car') && booking?.trip_destination) {
    extraLines.push(`🎯 Tujuan: ${esc(booking?.trip_destination)}`);
  }
  if ((booking?.item_type === 'motor' || booking?.item_type === 'car') && booking?.delivery_type && booking?.delivery_type !== 'self') {
    const dType = booking?.delivery_type === 'station'
      ? 'Ambil di stasiun'
      : booking?.delivery_type === 'address'
        ? 'Diantar ke alamat'
        : String(booking?.delivery_type);
    extraLines.push(`🚚 Pengantaran: ${esc(dType)}`);
    if (booking?.delivery_address) extraLines.push(`📍 Alamat antar: ${esc(booking?.delivery_address)}`);
    if (booking?.delivery_distance_km !== undefined && booking?.delivery_distance_km !== null && booking?.delivery_distance_km !== '') {
      extraLines.push(`📏 Jarak: ${esc(Number(booking?.delivery_distance_km).toFixed(1))} km`);
    }
  }

  const topicKey = booking?.item_type === 'locker' ? 'locker' : 'booking';
  return notifyTo(topicKey, {
    chat_id:    CHAT_ID,
    parse_mode: 'MarkdownV2',
    disable_web_page_preview: true,
    text: [
      `${meta.headerEmoji} *PESANAN BARU — ${esc(meta.typeLabel)}*`,
      ``,
      `🔖 Order: \`${esc(booking?.order_id)}\``,
      `👤 Pelanggan: ${esc(user?.name)}`,
      `📱 WA: ${esc(user?.phone)}`,
      `${meta.itemEmoji} Item: ${esc(booking?.item_name)}`,
      `📍 Lokasi: ${esc(booking?.location)}`,
      ...extraLines,
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
const notifyExtendBooking = (booking, user, newEndDate, extraCost) => {
  const meta = bookingMeta(booking);
  const extraLines = [];
  if (booking?.item_type === 'car' && booking?.plate_number) {
    extraLines.push(`🚘 Plat: *${esc(booking?.plate_number)}*`);
  }

  return notifyTo('booking', {
    chat_id:    CHAT_ID,
    parse_mode: 'MarkdownV2',
    disable_web_page_preview: true,
    text: [
      `🔄 *EXTEND BOOKING*`,
      ``,
      `🔖 Order: \`${esc(booking?.order_id)}\``,
      `👤 Pelanggan: ${esc(user?.name)}`,
      `📱 WA: ${esc(user?.phone)}`,
      `${meta.itemEmoji} Item: ${esc(booking?.item_name)}`,
      ...extraLines,
      ``,
      `📅 Selesai baru: *${esc(fmtDate(newEndDate))}*`,
      `💰 Biaya tambahan: *${esc(fmtRp(extraCost))}*`,
      `⚠️ Status bayar: UNPAID \\(perlu konfirmasi transfer\\)`,
      ``,
      `⏰ ${esc(fmtTime())}`,
      `👉 [Buka Dashboard](${ADMIN_URL}/booking)`,
    ].join('\n'),
  });
};


// ═══════════════════════════════════════════════════════════════════════════════
// 3. KYC PENDING
// ═══════════════════════════════════════════════════════════════════════════════
const notifyKycPending = (user) => {
  const phone = String(user?.phone || '').replace(/\D/g, '').replace(/^0/, '62');

  return notifyTo('kyc', {
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
  const meta = bookingMeta(booking);
  const extraLines = [];
  if (booking?.item_type === 'car' && booking?.plate_number) {
    extraLines.push(`🚘 Plat: *${esc(booking?.plate_number)}*`);
  }

  const BANK_LABELS = {
    bca:     'BCA',
    mandiri: 'Mandiri',
    bri:     'BRI',
    bni:     'BNI',
    qris:    'QRIS / E\\-Wallet',
    cash:    'Cash',
  };
  const bankLabel = BANK_LABELS[recon?.bank_name] || esc(recon?.bank_name);

  return notifyTo('payment', {
    chat_id:    CHAT_ID,
    parse_mode: 'MarkdownV2',
    disable_web_page_preview: true,
    text: [
      `✅ *PEMBAYARAN DIKONFIRMASI*`,
      ``,
      `🔖 Order: \`${esc(recon?.order_id)}\``,
      `👤 Pelanggan: ${esc(booking?.customer_name)}`,
      `📱 WA: ${esc(booking?.customer_phone)}`,
      `${meta.itemEmoji} Item: ${esc(booking?.item_name)}`,
      ...extraLines,
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
  await notifyTo('log', {
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
  return notifyTo('review', {
    chat_id: CHAT_ID,
    parse_mode: 'MarkdownV2',
    disable_web_page_preview: true,
    text: lines.filter(Boolean).join('\n'),
  });
};

// ═══════════════════════════════════════════════════════════════════════════════
// 6. BUKTI TRANSFER DIUNGGAH (user upload proof)
// ═══════════════════════════════════════════════════════════════════════════════
const notifyPaymentProofUploaded = (recon, booking, user) => {
  const meta = bookingMeta(booking);
  const extraLines = [];
  if (booking?.item_type === 'car' && booking?.plate_number) {
    extraLines.push(`🚘 Plat: *${esc(booking?.plate_number)}*`);
  }

  return notifyTo('payment', {
    chat_id:    CHAT_ID,
    parse_mode: 'MarkdownV2',
    disable_web_page_preview: true,
    text: [
      `💳 *BUKTI TRANSFER MASUK*`,
      ``,
      `🔖 Order: \`${esc(recon?.order_id)}\``,
      `👤 Pelanggan: ${esc(user?.name || '\\-')}`,
      `📱 WA: ${esc(user?.phone || '\\-')}`,
      `${meta.itemEmoji} Item: ${esc(booking?.item_name || '\\-')}`,
      ...extraLines,
      ``,
      `🏦 Bank: ${esc(recon?.bank_name)}`,
      `💰 Nominal: *${esc(fmtRp(recon?.transfer_amount))}*`,
      `📅 Tgl Transfer: ${esc(recon?.transfer_date)}`,
      ``,
      `⏰ ${esc(fmtTime())}`,
      `👉 [Verifikasi di Finance](${ADMIN_URL}/finance)`,
    ].join('\n'),
  });
};

module.exports = {
  notifyNewBooking,
  notifyExtendBooking,
  notifyKycPending,
  notifyPaymentConfirmed,
  notifyPaymentProofUploaded,
  testConnection,
  isEnabled,
  notifyGmapsReview,
};
