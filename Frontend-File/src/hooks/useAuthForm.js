import { useState, useContext, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { API_BASE_URL } from '../utils/api';
import { getAdminLandingPath } from '../utils/adminNavigation';

// --- Konstanta keamanan -------------------------------------------------------
const MAX_ATTEMPTS   = 5;
const LOCKOUT_MS     = 30_000; // 30 detik
const API_URL        = API_BASE_URL;

// --- Helper: sanitize input ---------------------------------------------------
export const sanitize = (str = '') =>
  str.trim().replace(/[<>"'`]/g, '');

// --- Helper: validasi email ---------------------------------------------------
export const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);

// --- Helper: cek password strength -------------------------------------------
export const passwordStrength = (pwd) => {
  if (!pwd) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pwd.length >= 8)              score++;
  if (/[A-Z]/.test(pwd))           score++;
  if (/[0-9]/.test(pwd))           score++;
  if (/[^A-Za-z0-9]/.test(pwd))   score++;
  const map = [
    { label: '',         color: '' },
    { label: 'Lemah',   color: 'bg-red-500' },
    { label: 'Cukup',   color: 'bg-amber-500' },
    { label: 'Kuat',    color: 'bg-blue-500' },
    { label: 'Sangat Kuat', color: 'bg-green-500' },
  ];
  return { score, ...map[score] };
};

// --- Helper: format phone -----------------------------------------------------
export const formatPhone = (raw = '') => {
  let num = raw.replace(/\D/g, '');
  if (num.startsWith('62'))  num = '0' + num.slice(2);
  if (num.startsWith('+62')) num = '0' + num.slice(3);
  return num;
};

// --- Rate limiter (in-memory, per session) ------------------------------------
const rateLimiter = {
  attempts:  0,
  lockedUntil: 0,
  isLocked()   { return Date.now() < this.lockedUntil; },
  remaining()  { return Math.ceil((this.lockedUntil - Date.now()) / 1000); },
  increment()  {
    this.attempts++;
    if (this.attempts >= MAX_ATTEMPTS) {
      this.lockedUntil = Date.now() + LOCKOUT_MS;
      this.attempts    = 0;
    }
  },
  reset() { this.attempts = 0; this.lockedUntil = 0; },
};

// --- Hook utama ---------------------------------------------------------------
export const useAuthForm = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { login } = useContext(AuthContext) || {};

  const [isLoading,    setIsLoading]    = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error,        setError]        = useState('');
  const [forgotStatus, setForgotStatus] = useState({ type: '', message: '' });
  const [lockSeconds,  setLockSeconds]  = useState(0);

  // Countdown timer ref
  const timerRef = useRef(null);

  // --- Mulai countdown -----------------------------------------------------
  const startCountdown = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const secs = rateLimiter.remaining();
      setLockSeconds(secs);
      if (secs <= 0) {
        clearInterval(timerRef.current);
        setLockSeconds(0);
        setError('');
      }
    }, 500);
  }, []);

  // --- Shared fetch helper --------------------------------------------------
  const authFetch = useCallback(async (endpoint, body) => {
    const res  = await fetch(`${API_URL}${endpoint}`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest', // CSRF hint
      },
      credentials: 'same-origin',
      body: JSON.stringify(body),
    });
    return res.json();
  }, []);

  const redirectAfterAuth = useCallback((user) => {
    const role = user?.role;
    if (role === 'superadmin' || role === 'admin' || role === 'subadmin') {
      navigate(getAdminLandingPath(user));
      return;
    }

    const pending = sessionStorage.getItem('pending_checkout');
    if (pending) {
      sessionStorage.removeItem('pending_checkout');
      try {
        const parsed = JSON.parse(pending);
        const path =
          parsed?.checkout_path ||
          (parsed?.item_type === 'car' ? '/checkout-mobil'
            : parsed?.item_type === 'locker' ? '/checkout-loker'
              : '/checkout-motor');
        navigate(path, { state: parsed, replace: true });
        return;
      } catch {
        navigate('/checkout-motor', { replace: true });
        return;
      }
    }

    if (location?.state?.from) {
      const from = location.state.from;
      const nextState = { ...(location.state || {}) };
      delete nextState.from;
      navigate(from, { state: nextState, replace: true });
      return;
    }

    navigate('/dashboard');
  }, [navigate, location]);

  // --- FUNGSI: Login --------------------------------------------------------
  const handleLoginSubmit = useCallback(async (rawData) => {
    // Rate limit check
    if (rateLimiter.isLocked()) {
      setError(`Terlalu banyak percobaan. Coba lagi dalam ${rateLimiter.remaining()} detik.`);
      return;
    }

    setError('');
    setIsLoading(true);

    // Sanitize
    const email    = sanitize(rawData.email).toLowerCase();
    const password = rawData.password; // password tidak di-trim agar spasi sengaja tetap valid

    // Validasi dasar
    if (!isValidEmail(email)) {
      setError('Format email tidak valid.');
      setIsLoading(false);
      return;
    }
    if (!password || password.length < 6) {
      setError('Password minimal 6 karakter.');
      setIsLoading(false);
      return;
    }

    try {
      const result = await authFetch('/api/auth/login', { email, password });

      if (result.success) {
        rateLimiter.reset();
        if (login) login(result.user, result.token);
        redirectAfterAuth(result.user);
      } else {
        if (result?.needs_email_verification) {
          navigate('/verify-email', { state: { email }, replace: true });
          return;
        }
        rateLimiter.increment();
        if (rateLimiter.isLocked()) {
          startCountdown();
          setError(`Login gagal terlalu banyak. Akun dikunci ${LOCKOUT_MS / 1000} detik.`);
        } else {
          const left = MAX_ATTEMPTS - rateLimiter.attempts;
          setError((result.error || 'Email atau password salah.') + (left < MAX_ATTEMPTS ? ` (${left} percobaan tersisa)` : ''));
        }
      }
    } catch {
      setError('Gagal terhubung ke server. Periksa koneksi internet Anda.');
    } finally {
      setIsLoading(false);
    }
  }, [authFetch, login, navigate, startCountdown, redirectAfterAuth]);

  // --- FUNGSI: Google Login (Sign-In) ---------------------------------------
  const handleGoogleCredential = useCallback(async (credential) => {
    if (!credential) return false;
    setError('');
    setGoogleLoading(true);
    try {
      const result = await authFetch('/api/auth/google', { id_token: credential });
      if (result?.success) {
        if (result?.needs_profile) {
          if (result?.temp_token) {
            sessionStorage.setItem('google_complete_temp_token', result.temp_token);
          }
          if (result?.profile) {
            sessionStorage.setItem('google_complete_profile', JSON.stringify(result.profile));
          }
          navigate('/google/complete-profile', {
            state: { temp_token: result?.temp_token, profile: result?.profile },
            replace: true,
          });
          return true;
        }
        if (login) login(result.user, result.token);
        redirectAfterAuth(result.user);
        return true;
      }
      setError(result?.error || 'Gagal login dengan Google.');
      return false;
    } catch {
      setError('Gagal terhubung ke server.');
      return false;
    } finally {
      setGoogleLoading(false);
    }
  }, [authFetch, login, navigate, redirectAfterAuth]);

  // --- FUNGSI: Lengkapi Profil setelah Google -------------------------------
  const handleGoogleCompleteSubmit = useCallback(async (rawData) => {
    setError('');
    setGoogleLoading(true);

    const tempToken =
      typeof rawData?.temp_token === 'string' && rawData.temp_token
        ? rawData.temp_token
        : (sessionStorage.getItem('google_complete_temp_token') || '');
    const phone = formatPhone(sanitize(rawData?.phone || ''));
    const ktp_id = sanitize(rawData?.ktp_id || '').replace(/\D/g, '');

    if (!tempToken) {
      setError('Sesi Google kedaluwarsa. Silakan ulangi login Google.');
      setGoogleLoading(false);
      return false;
    }
    if (!phone || phone.length < 10 || phone.length > 15) {
      setError('Nomor HP tidak valid (10-15 digit).');
      setGoogleLoading(false);
      return false;
    }
    if (!ktp_id || ktp_id.length !== 16) {
      setError('ID KTP (NIK) harus 16 digit angka.');
      setGoogleLoading(false);
      return false;
    }

    try {
      const result = await authFetch('/api/auth/google/complete', { temp_token: tempToken, phone, ktp_id });
      if (result?.success) {
        sessionStorage.removeItem('google_complete_temp_token');
        sessionStorage.removeItem('google_complete_profile');
        if (login) login(result.user, result.token);
        redirectAfterAuth(result.user);
        return true;
      }
      setError(result?.error || 'Gagal menyimpan data akun.');
      return false;
    } catch {
      setError('Gagal terhubung ke server.');
      return false;
    } finally {
      setGoogleLoading(false);
    }
  }, [authFetch, login, redirectAfterAuth]);

  // --- FUNGSI: Register -----------------------------------------------------
  const handleRegisterSubmit = useCallback(async (rawData) => {
    setError('');
    setIsLoading(true);

    const name      = sanitize(rawData.name);
    const email     = sanitize(rawData.email).toLowerCase();
    const phone     = formatPhone(sanitize(rawData.phone));
    const ktp_id    = sanitize(rawData.ktp_id || '').replace(/\D/g, '');
    const password  = rawData.password;
    const referredBy = rawData.referred_by ? sanitize(rawData.referred_by).toUpperCase() : undefined;

    // Validasi
    if (name.length < 2) {
      setError('Nama lengkap minimal 2 karakter.');
      setIsLoading(false);
      return;
    }
    if (!isValidEmail(email)) {
      setError('Format email tidak valid.');
      setIsLoading(false);
      return;
    }
    if (!phone || phone.length < 10 || phone.length > 15) {
      setError('Nomor HP tidak valid (10-15 digit).');
      setIsLoading(false);
      return;
    }
    if (!ktp_id || ktp_id.length !== 16) {
      setError('ID KTP (NIK) harus 16 digit angka.');
      setIsLoading(false);
      return;
    }
    if (!password || password.length < 6) {
      setError('Password minimal 6 karakter.');
      setIsLoading(false);
      return;
    }

    try {
      const result = await authFetch('/api/auth/register', {
        name, email, phone, ktp_id, password,
        ...(referredBy ? { referred_by: referredBy } : {}),
      });

      if (result.success) {
        if (result?.email_otp_required) {
          navigate('/verify-email', { state: { email }, replace: true });
        } else {
          navigate('/login', { state: { registered: true, email } });
        }
        return true;
      } else {
        setError(result.error || 'Terjadi kesalahan saat registrasi.');
        return false;
      }
    } catch {
      setError('Gagal terhubung ke server.');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [authFetch, navigate]);

  // --- FUNGSI: Lupa Password ------------------------------------------------
  const handleForgotPasswordSubmit = useCallback(async (rawEmail) => {
    setIsLoading(true);
    setForgotStatus({ type: '', message: '' });

    const email = sanitize(rawEmail).toLowerCase();
    if (!isValidEmail(email)) {
      setForgotStatus({ type: 'error', message: 'Format email tidak valid.' });
      setIsLoading(false);
      return false;
    }

    try {
      const result = await authFetch('/api/auth/forgot-password', { email });
      if (result.success) {
        setForgotStatus({ type: 'success', message: 'Tautan reset sandi telah dikirim ke email Anda. Cek folder spam jika tidak muncul.' });
        return true;
      } else {
        setForgotStatus({ type: 'error', message: result.error || 'Gagal mengirim email reset.' });
        return false;
      }
    } catch {
      setForgotStatus({ type: 'error', message: 'Gagal terhubung ke server.' });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [authFetch]);

  return {
    isLoading,
    googleLoading,
    error,
    forgotStatus,
    setForgotStatus,
    lockSeconds,
    handleLoginSubmit,
    handleGoogleCredential,
    handleGoogleCompleteSubmit,
    handleRegisterSubmit,
    handleForgotPasswordSubmit,
  };
};
