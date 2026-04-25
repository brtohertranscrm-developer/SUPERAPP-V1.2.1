import React from 'react';
import LegalPageShell from '../../components/public/legal/LegalPageShell';

const LAST_UPDATED_LABEL = '25 April 2026';

const SUMMARY = [
  'Kami membantu kamu booking & menyewa unit, plus layanan operasional (antar/ambil, bantuan, komplain).',
  'Kami hanya meminta data yang relevan agar transaksi aman dan komunikasi lancar.',
  'Harga, ketersediaan, dan jadwal mengikuti info yang ditampilkan saat checkout dan konfirmasi sistem.',
  'Jika ada perubahan/pembatalan, konsekuensi (jika ada) akan diinformasikan sebelum diproses.',
  'Kamu bisa menghubungi kami kapan saja untuk bantuan atau komplain.',
];

const SECTIONS = [
  {
    title: '1) Layanan',
    body: (
      <>
        <p>
          Aplikasi ini menyediakan pemesanan dan pengelolaan sewa unit (misalnya motor, loker, atau layanan terkait).
          Beberapa layanan mungkin hanya tersedia di kota tertentu atau pada waktu tertentu.
        </p>
      </>
    ),
  },
  {
    title: '2) Akun & kelengkapan data',
    body: (
      <>
        <p>
          Kamu perlu akun agar kami bisa menghubungkan booking dengan kamu, mengirim informasi transaksi, dan membantu jika
          terjadi kendala. Kami hanya meminta data yang relevan dengan proses sewa.
        </p>
      </>
    ),
  },
  {
    title: '3) Verifikasi identitas (kenapa perlu)',
    body: (
      <>
        <p>
          Untuk keamanan bersama, kami dapat meminta verifikasi (misalnya KTP/SIM/selfie) saat diperlukan. Tujuannya
          untuk mencegah penipuan, memastikan unit tidak disalahgunakan, dan melindungi penyewa serta tim operasional.
        </p>
      </>
    ),
  },
  {
    title: '4) Booking, pembayaran, dan deposit',
    body: (
      <>
        <p>
          Rincian biaya (sewa, layanan, ongkir, promo) ditampilkan sebelum checkout. Setelah pembayaran, status booking
          mengikuti verifikasi pembayaran dan ketersediaan unit.
        </p>
      </>
    ),
  },
  {
    title: '5) Pengantaran / serah-terima',
    body: (
      <>
        <p>
          Jika kamu memilih layanan antar/ambil, kamu akan diminta titik/alamat serah-terima. Estimasi biaya dapat
          berubah jika ada perubahan titik, kondisi akses, atau kondisi lapangan lainnya, dan akan dikomunikasikan.
        </p>
      </>
    ),
  },
  {
    title: '6) Pembatalan & perubahan jadwal',
    body: (
      <>
        <p>
          Jika kamu membatalkan atau mengubah jadwal, kami akan menampilkan/menjelaskan konsekuensi yang relevan (jika
          ada) sebelum diproses.
        </p>
      </>
    ),
  },
  {
    title: '7) Komunikasi',
    body: (
      <>
        <p>
          Kami dapat menghubungi kamu via WhatsApp/telepon/email untuk hal yang terkait transaksi (konfirmasi, perubahan
          jadwal, bantuan). Untuk promosi, kamu bisa memilih untuk menerima atau menolak.
        </p>
      </>
    ),
  },
  {
    title: '8) Batasan tanggung jawab',
    body: (
      <>
        <p>
          Kami berusaha menjaga layanan tetap akurat, namun mungkin ada perubahan ketersediaan atau gangguan sistem. Jika
          ada masalah, kami akan membantu tindak lanjut secepatnya.
        </p>
      </>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalPageShell title="Syarat & Ketentuan" lastUpdatedLabel={LAST_UPDATED_LABEL} summaryItems={SUMMARY}>
      {SECTIONS.map((s) => (
        <details key={s.title} className="group rounded-2xl border border-slate-200 bg-white p-5 open:shadow-sm">
          <summary className="cursor-pointer list-none select-none flex items-center justify-between gap-4">
            <span className="font-black text-slate-900">{s.title}</span>
            <span className="text-slate-400 font-black group-open:rotate-45 transition-transform">+</span>
          </summary>
          <div className="mt-4 text-sm text-slate-600 font-medium leading-relaxed space-y-3">{s.body}</div>
        </details>
      ))}

      <div className="pt-2 text-[11px] text-slate-400 font-medium">
        Catatan: dokumen ini dibuat untuk membantu kamu memahami aturan layanan dengan bahasa yang ringan.
      </div>
    </LegalPageShell>
  );
}

