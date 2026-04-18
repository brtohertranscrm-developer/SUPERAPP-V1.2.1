'use strict';

/**
 * MAILER UTILITY — Brothers Trans
 * =================================
 * Kirim email via Resend API (HTTPS) — tidak butuh port SMTP.
 * Solusi untuk jaringan yang blokir port 25/465/587.
 *
 * Setup:
 *   1. Daftar gratis di https://resend.com
 *   2. Dashboard → API Keys → Create API Key → copy key
 *   3. Tambah ke .env:
 *        RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
 *        MAIL_FROM=Brothers Trans <onboarding@resend.dev>
 *
 * Catatan: Pakai domain @resend.dev gratis untuk testing.
 * Untuk domain sendiri (@brotherstrans.com), verifikasi domain di Resend dashboard.
 */

const https = require('https');

const RESEND_API_KEY  = process.env.RESEND_API_KEY;
const MAIL_FROM       = process.env.MAIL_FROM || 'Brothers Trans <onboarding@resend.dev>';
// MAIL_TO_OVERRIDE: isi sementara saat belum verifikasi domain di Resend
// Semua email akan diarahkan ke alamat ini. Kosongkan setelah domain verified.
const MAIL_TO_OVERRIDE = process.env.MAIL_TO_OVERRIDE || null;

if (!RESEND_API_KEY) {
  console.warn('⚠️  Mailer: RESEND_API_KEY belum di-set di .env');
  console.warn('   Daftar gratis di https://resend.com → API Keys → Create');
  console.warn('   Email reset password dinonaktifkan sampai key diisi.');
}

const isEnabled = () => !!RESEND_API_KEY;

// ─── Kirim email via Resend API (HTTPS port 443) ─────────────────────────────
const sendMail = ({ to, subject, html, text }) => {
  return new Promise((resolve) => {
    if (!isEnabled()) return resolve({ success: false, reason: 'mailer_not_configured' });

    // Jika MAIL_TO_OVERRIDE di-set, arahkan semua email ke sana (mode testing)
    const recipient = MAIL_TO_OVERRIDE || to;
    if (MAIL_TO_OVERRIDE) {
      console.log(`📧 Mailer [TEST MODE]: email untuk ${to} dialihkan ke ${MAIL_TO_OVERRIDE}`);
    }

    const body = JSON.stringify({
      from:    MAIL_FROM,
      to:      [recipient],
      subject: MAIL_TO_OVERRIDE ? `[TEST → ${to}] ${subject}` : subject,
      html,
      text,
    });

    const options = {
      hostname: 'api.resend.com',
      path:     '/emails',
      method:   'POST',
      headers:  {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type':  'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
      timeout: 10000,
    };

    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', (c) => { raw += c; });
      res.on('end', () => {
        try {
          const result = JSON.parse(raw);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ success: true, messageId: result.id });
          } else {
            console.error('⚠️  Resend API error:', result.message || raw);
            resolve({ success: false, reason: result.message || 'API error' });
          }
        } catch {
          resolve({ success: false, reason: 'parse error' });
        }
      });
    });

    req.on('error',   (e) => { console.error('⚠️  Mailer error (tidak gagalkan proses utama):', e.message); resolve({ success: false, reason: e.message }); });
    req.on('timeout', ()  => { console.error('⚠️  Mailer timeout'); req.destroy(); resolve({ success: false, reason: 'timeout' }); });
    req.write(body);
    req.end();
  });
};

// ─── Template: Reset Password ─────────────────────────────────────────────────
const sendResetPasswordEmail = async (toEmail, resetLink) => {
  const subject = 'Reset Password - Brothers Trans';

  const html = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background:#0f172a;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:900;letter-spacing:-0.5px;">
                Brothers Trans
              </h1>
              <p style="margin:6px 0 0;color:#94a3b8;font-size:13px;">Rental Motor & Smart Loker Yogyakarta</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 12px;color:#0f172a;font-size:18px;font-weight:900;">
                Reset Password Akunmu
              </h2>
              <p style="margin:0 0 24px;color:#475569;font-size:14px;line-height:1.6;">
                Kami menerima permintaan untuk mereset password akun Brothers Trans kamu.
                Klik tombol di bawah untuk melanjutkan. Link ini berlaku selama <strong>1 jam</strong>.
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 32px;">
                    <a href="${resetLink}"
                       style="display:inline-block;background:#ef4444;color:#ffffff;font-size:15px;font-weight:900;padding:14px 32px;border-radius:10px;text-decoration:none;letter-spacing:0.3px;">
                      Reset Password Sekarang
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Fallback link -->
              <p style="margin:0 0 8px;color:#64748b;font-size:12px;">
                Tombol tidak berfungsi? Salin link berikut ke browser:
              </p>
              <p style="margin:0 0 24px;word-break:break-all;">
                <a href="${resetLink}" style="color:#3b82f6;font-size:12px;">${resetLink}</a>
              </p>

              <!-- Warning -->
              <div style="background:#fef9c3;border:1px solid #fde047;border-radius:8px;padding:14px 16px;">
                <p style="margin:0;color:#713f12;font-size:12px;line-height:1.5;">
                  ⚠️ Jika kamu tidak meminta reset password, abaikan email ini.
                  Password kamu tidak akan berubah.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:24px 40px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="margin:0;color:#94a3b8;font-size:11px;">
                © ${new Date().getFullYear()} Brothers Trans · Yogyakarta
              </p>
              <p style="margin:4px 0 0;color:#94a3b8;font-size:11px;">
                Email ini dikirim otomatis, mohon tidak membalas.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `
Reset Password - Brothers Trans

Kami menerima permintaan untuk mereset password akun Brothers Trans kamu.
Buka link berikut untuk melanjutkan (berlaku 1 jam):

${resetLink}

Jika kamu tidak meminta reset password, abaikan email ini.

© ${new Date().getFullYear()} Brothers Trans · Yogyakarta
  `.trim();

  return sendMail({ to: toEmail, subject, html, text });
};

// ─── Test koneksi — panggil saat server start ─────────────────────────────────
const testConnection = async () => {
  if (!isEnabled()) {
    console.warn('⚠️  Mailer: RESEND_API_KEY belum di-set, email dinonaktifkan.');
    return;
  }
  // Test dengan hit endpoint domains Resend (tidak kirim email sungguhan)
  const result = await new Promise((resolve) => {
    const req = https.request({
      hostname: 'api.resend.com',
      path:     '/domains',
      method:   'GET',
      headers:  { 'Authorization': `Bearer ${RESEND_API_KEY}` },
      timeout:  5000,
    }, (res) => {
      resolve(res.statusCode < 500);
    });
    req.on('error',   () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.end();
  });

  if (result) {
    console.log('✅ Mailer: koneksi Resend API berhasil, email aktif.');
  } else {
    console.error('⚠️  Mailer: gagal konek ke Resend API — cek RESEND_API_KEY di .env');
  }
};

module.exports = {
  sendResetPasswordEmail,
  testConnection,
  isEnabled,
};
