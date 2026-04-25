import React from 'react';
import LegalPageShell from '../../components/public/legal/LegalPageShell';
import { WA_CONTACTS, buildWaLink } from '../../config/contacts';

const LAST_UPDATED_LABEL = '25 April 2026';

const SUMMARY = [
  'Kami memproses data seperlunya agar booking berjalan lancar dan aman.',
  'Kami tidak menjual data pribadi kamu.',
  'Data dibagikan hanya jika dibutuhkan untuk menjalankan layanan (pembayaran/operasional).',
  'Kamu bisa minta koreksi atau penghapusan data tertentu.',
];

const SECTIONS = [
  {
    title: '1) Data apa yang kami gunakan',
    body: (
      <>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <span className="font-black text-slate-700">Data akun</span>: nama, nomor WhatsApp/telepon, email.
          </li>
          <li>
            <span className="font-black text-slate-700">Data transaksi</span>: detail booking, pembayaran, promo, riwayat.
          </li>
          <li>
            <span className="font-black text-slate-700">Data operasional</span>: titik serah-terima/alamat (jika pilih antar/ambil), catatan order.
          </li>
          <li>
            <span className="font-black text-slate-700">Data verifikasi</span>: dokumen/Foto verifikasi (jika diperlukan untuk keamanan).
          </li>
          <li>
            <span className="font-black text-slate-700">Data teknis dasar</span>: log akses, perangkat, dan informasi error (untuk perbaikan layanan).
          </li>
        </ul>
      </>
    ),
  },
  {
    title: '2) Untuk apa data dipakai',
    body: (
      <>
        <ul className="list-disc pl-5 space-y-2">
          <li>Memproses booking, pembayaran, dan konfirmasi.</li>
          <li>Menghubungkan kamu dengan tim operasional (antar/ambil) saat diperlukan.</li>
          <li>Pencegahan penipuan dan keamanan.</li>
          <li>Dukungan pelanggan & penyelesaian komplain.</li>
          <li>Peningkatan kualitas layanan (analitik sederhana).</li>
        </ul>
      </>
    ),
  },
  {
    title: '3) Lokasi (biar jelas)',
    body: (
      <>
        <p>
          Kami hanya memakai lokasi jika kamu memasukkan titik/alamat untuk pengantaran atau memilih fitur yang memang
          butuh lokasi. Kami tidak melacak lokasi real-time di latar belakang.
        </p>
      </>
    ),
  },
  {
    title: '4) Berbagi data',
    body: (
      <>
        <p className="mb-3">
          Kami dapat membagikan data secara terbatas kepada pihak yang membantu proses layanan:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Penyedia pembayaran (untuk verifikasi transaksi).</li>
          <li>Tim operasional/mitra (untuk menjalankan pengantaran/layanan).</li>
          <li>Penyedia infrastruktur (hosting/log) untuk menjalankan aplikasi.</li>
        </ul>
        <p className="mt-3">Di luar itu, kami tidak membagikan data tanpa dasar yang sah.</p>
      </>
    ),
  },
  {
    title: '5) Penyimpanan & keamanan',
    body: (
      <>
        <p>
          Kami menyimpan data selama diperlukan untuk layanan dan kewajiban operasional. Kami menerapkan langkah
          pengamanan yang wajar untuk melindungi data.
        </p>
      </>
    ),
  },
  {
    title: '6) Pilihan kamu',
    body: (
      <>
        <ul className="list-disc pl-5 space-y-2">
          <li>Memperbarui profil.</li>
          <li>Meminta koreksi jika ada data yang tidak tepat.</li>
          <li>Meminta penghapusan akun/data tertentu (jika tidak terikat kewajiban transaksi/keamanan).</li>
        </ul>
      </>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalPageShell
      title="Kebijakan Privasi"
      lastUpdatedLabel={LAST_UPDATED_LABEL}
      summaryItems={SUMMARY}
      badges={['Tidak jual data', 'Tidak lacak realtime', 'Seperlunya']}
      helpCta={{
        href: buildWaLink(WA_CONTACTS.SUPPORT_ADMIN.phone_wa, 'Halo Admin Brother Trans, saya ada pertanyaan soal privasi.'),
        label: 'Chat Admin (WA)',
        description: 'Tanya soal data yang kami pakai & kenapa diperlukan.',
      }}
    >
      {SECTIONS.map((s) => (
        <details key={s.title} className="group rounded-2xl border border-slate-200 bg-white p-5 open:shadow-sm">
          <summary className="cursor-pointer list-none select-none flex items-center justify-between gap-4">
            <span className="font-black text-slate-900">{s.title}</span>
            <span className="text-slate-400 font-black group-open:rotate-45 transition-transform">+</span>
          </summary>
          <div className="mt-4 text-sm text-slate-600 font-medium leading-relaxed space-y-3">{s.body}</div>
        </details>
      ))}
    </LegalPageShell>
  );
}
