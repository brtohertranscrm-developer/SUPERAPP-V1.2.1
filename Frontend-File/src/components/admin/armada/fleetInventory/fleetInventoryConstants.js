export const DAY_LABELS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export const MONTH_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

// green=1 tamu, orange=2+ tamu, red=maintenance, striped=keduanya
export const CSTATUS = {
  free: { bg: 'transparent', text: '#94a3b8', label: 'Kosong' },
  single: { bg: '#16a34a', text: '#fff', label: '1 Booking' },
  double: { bg: '#d97706', text: '#fff', label: '2+ Booking' },
  maintenance: { bg: '#dc2626', text: '#fff', label: 'Maintenance' },
  mixed: { bg: '#d97706', text: '#fff', label: 'Booking + Servis' },
};

