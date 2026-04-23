import { API_BASE_URL } from './api';

const normalizeBase = (value) => {
  if (!value) return '';
  return value.endsWith('/') ? value.slice(0, -1) : value;
};

const backendBase = normalizeBase(API_BASE_URL);

export const resolveMediaUrl = (value) => {
  if (!value) return value;

  const raw = String(value).trim();
  if (!raw) return raw;

  if (raw.startsWith('/uploads/')) {
    return `${backendBase}${raw}`;
  }

  if (!/^https?:\/\//i.test(raw)) {
    return raw;
  }

  try {
    const url = new URL(raw);
    const isLocalUpload =
      (url.hostname === 'localhost' || url.hostname === '127.0.0.1') &&
      url.pathname.startsWith('/uploads/');

    if (isLocalUpload && backendBase) {
      return `${backendBase}${url.pathname}`;
    }

    return raw;
  } catch {
    return raw;
  }
};
