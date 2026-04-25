export const fmtRp = (value) => {
  const n = Number(value) || 0;
  try {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `Rp ${n.toLocaleString('id-ID')}`;
  }
};

export const calcDays = (start, end) => {
  const s = new Date(start);
  const e = new Date(end);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e <= s) return 1;
  const ms = e - s;
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
};

export const generateCarOrderId = () => {
  const date = new Date();
  return `BTC-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}-${Math.floor(
    1000 + Math.random() * 9000
  )}`;
};

