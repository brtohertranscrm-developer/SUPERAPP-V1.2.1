const HOUR_MS = 60 * 60 * 1000;

const pad = (value) => String(value).padStart(2, '0');

const normalizeTime = (timeValue, fallback = '09:00') => {
  if (typeof timeValue !== 'string' || !/^\d{2}:\d{2}$/.test(timeValue)) {
    return fallback;
  }
  return timeValue;
};

const toLocalDateTime = (dateValue, timeValue) => {
  if (!dateValue) return null;

  if (dateValue instanceof Date) {
    return Number.isNaN(dateValue.getTime()) ? null : dateValue;
  }

  if (typeof dateValue === 'string' && (dateValue.includes('T') || dateValue.includes(' '))) {
    const date = new Date(dateValue);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const safeTime = normalizeTime(timeValue);
  const [year, month, day] = String(dateValue).split('-').map(Number);
  const [hours, minutes] = safeTime.split(':').map(Number);
  if (!year || !month || !day) return null;

  const date = new Date(year, month - 1, day, hours || 0, minutes || 0, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatBillableSummary = (count24h = 0, count12h = 0) => {
  const parts = [];
  if (count24h > 0) parts.push(`${count24h} hari`);
  if (count12h > 0) parts.push(`${count12h} x 12 jam`);
  return parts.length ? parts.join(' + ') : '0 jam';
};

const calculateMotorRentalBreakdown = ({
  startDate,
  startTime,
  endDate,
  endTime,
  price24h = 0,
  price12h = 0,
}) => {
  const startAt = toLocalDateTime(startDate, startTime);
  const endAt = toLocalDateTime(endDate, endTime || '09:00');

  if (!startAt || !endAt) {
    return { isValid: false, error: 'Tanggal atau jam booking tidak valid.' };
  }

  if (endAt <= startAt) {
    return { isValid: false, error: 'Waktu kembali harus setelah waktu ambil.' };
  }

  const safePrice24h = Math.max(0, Number(price24h) || 0);
  const safePrice12h = Math.max(0, Number(price12h) || 0);
  const cursor = new Date(startAt.getFullYear(), startAt.getMonth(), startAt.getDate(), 0, 0, 0, 0);
  const dailyBreakdown = [];
  let count12h = 0;
  let count24h = 0;

  while (cursor < endAt) {
    const dayStart = new Date(cursor);
    const dayEnd = new Date(cursor);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const segmentStart = startAt > dayStart ? startAt : dayStart;
    const segmentEnd = endAt < dayEnd ? endAt : dayEnd;
    const usedMs = segmentEnd.getTime() - segmentStart.getTime();

    if (usedMs > 0) {
      const usedHours = usedMs / HOUR_MS;
      const packageHours = usedHours > 12 ? 24 : 12;
      const packagePrice = packageHours === 24 ? safePrice24h : safePrice12h;

      if (packageHours === 24) count24h += 1;
      else count12h += 1;

      dailyBreakdown.push({
        date: `${dayStart.getFullYear()}-${pad(dayStart.getMonth() + 1)}-${pad(dayStart.getDate())}`,
        usedHours,
        packageHours,
        price: packagePrice,
      });
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return {
    isValid: true,
    startAt,
    endAt,
    actualHours: (endAt.getTime() - startAt.getTime()) / HOUR_MS,
    calendarDays: dailyBreakdown.length,
    count12h,
    count24h,
    billableHours: (count24h * 24) + (count12h * 12),
    billableDayUnits: count24h + (count12h * 0.5),
    baseTotal: dailyBreakdown.reduce((total, item) => total + item.price, 0),
    dailyBreakdown,
    packageSummary: formatBillableSummary(count24h, count12h),
  };
};

module.exports = {
  calculateMotorRentalBreakdown,
  formatBillableSummary,
  normalizeTime,
  toLocalDateTime,
};
