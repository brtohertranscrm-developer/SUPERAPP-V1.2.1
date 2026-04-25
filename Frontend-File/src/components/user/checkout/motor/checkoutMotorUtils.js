export const fmtRp = (n) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;

export const normalizeName = (s) => String(s || '').trim().toLowerCase();

export const fmtDateTimeId = (dateStr, timeStr) => {
  try {
    if (!dateStr) return '-';
    const iso = `${dateStr}T${timeStr || '00:00'}:00`;
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) return `${dateStr} ${timeStr || ''}`.trim();
    return dt.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return `${dateStr || ''} ${timeStr || ''}`.trim() || '-';
  }
};

export const generateOrderId = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `BTM-${y}${m}${d}-${rand}`;
};

