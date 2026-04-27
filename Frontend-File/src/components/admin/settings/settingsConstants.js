export const API_URL = import.meta.env.VITE_API_URL?.trim() || '';

export const availableMenus = [
  { key: 'dashboard', label: 'Dashboard Stats' },
  { key: 'booking', label: 'Data Pesanan (Booking)' },
  { key: 'logistics', label: 'Jadwal Antar/Kembali (View)' },
  { key: 'logistics_manage', label: 'Jadwal Antar/Kembali (Manage)' },
  { key: 'manning', label: 'Manning Tim (Karyawan & Libur)' },
  { key: 'finance', label: 'Finance & Laporan Keuangan' },
  { key: 'armada', label: 'Manajemen Armada & Unit' },
  { key: 'loker', label: 'Manajemen Loker' },
  { key: 'pricing', label: 'Dynamic Pricing & Promo' },
  { key: 'tickets', label: 'Ticketing (Produk Tiket & Event)' },
  { key: 'partners', label: 'Partnership (Homepage Partner)' },
  { key: 'artikel', label: 'Konten Artikel' },
  { key: 'content', label: 'SEO Pages (Landing Pages)' },
  { key: 'users', label: 'Data Pelanggan & KYC' },
  { key: 'settings', label: 'Pengaturan & Akses' },
];

export const permissionPresets = [
  { key: 'partner', label: 'Partner', permissions: ['partners'] },
  {
    key: 'staff_ops',
    label: 'Staff Operasional',
    // Staff ops butuh lihat Fleet Inventory (armada) tapi action manage dibatasi di backend (admin-only).
    permissions: ['logistics', 'manning', 'armada'],
  },
  { key: 'finance', label: 'Finance', permissions: ['finance', 'settings'] },
  { key: 'konten', label: 'Konten', permissions: ['artikel', 'partners', 'pricing', 'content', 'tickets'] },
];
