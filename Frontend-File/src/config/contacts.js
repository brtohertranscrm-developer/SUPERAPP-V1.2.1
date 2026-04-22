// Centralized contact configuration (avoid hardcoded WA numbers in components)

const normalizeDigits = (v = '') => String(v).replace(/\D/g, '');

// Convert Indonesian local format (08xx...) into WhatsApp international format (62xx...).
export const formatWaNumber = (input = '') => {
  let d = normalizeDigits(input);
  if (!d) return '';

  // Already international
  if (d.startsWith('62')) return d;

  // Local: 08xxxx -> 628xxxx
  if (d.startsWith('08')) return `628${d.slice(2)}`;

  // Local without leading 0: 8xxxx -> 62xxxx
  if (d.startsWith('8')) return `62${d}`;

  return d;
};

export const WA_CONTACTS = {
  SOLO_ADMIN: {
    label: 'Admin Solo',
    phone_local: '0823-1330-7400',
    phone_wa: formatWaNumber('0823-1330-7400'),
  },
  JOGJA_ADMIN: {
    label: 'Admin Yogyakarta',
    phone_local: '082137928331',
    phone_wa: formatWaNumber('082137928331'),
  },
  KYC_ADMIN: {
    label: 'Admin Verifikasi KYC',
    phone_local: '082137928331',
    phone_wa: formatWaNumber('082137928331'),
  },
  SUPPORT_ADMIN: {
    label: 'Admin Tiket Bantuan',
    phone_local: '082137928331',
    phone_wa: formatWaNumber('082137928331'),
  },
};

export const buildWaLink = (waNumber, message = '') => {
  const n = formatWaNumber(waNumber);
  const text = encodeURIComponent(message || '');
  return `https://wa.me/${n}${text ? `?text=${text}` : ''}`;
};

