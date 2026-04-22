import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import {
  ChevronLeft, Tag, ShieldAlert, CheckCircle2, XCircle,
  Loader2, MapPin, Calendar, Bike, CreditCard, Wallet,
  AlertTriangle, Info, Percent, X, Clock, Users, CloudRain
} from 'lucide-react';
import {
  calculateMotorRentalBreakdown,
  formatBillableSummary,
  formatDateTimeForInput,
} from '../../utils/motorRentalPricing';
import { formatLatLng, parseLatLngFromText } from '../../utils/geo';

// ─── Constants ────────────────────────────────────────────────────────────────
const API_URL = import.meta.env.VITE_API_URL?.trim() || '';
const SERVICE_FEE = 2500;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtRp = (n) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;

const generateOrderId = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `BTM-${y}${m}${d}-${rand}`;
};

// ─── Sub-components ───────────────────────────────────────────────────────────

/** KYC Warning Banner */
const KycBanner = ({ status, onNavigate }) => (
  <div className="bg-rose-50 border-2 border-rose-200 rounded-2xl p-5 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
    <div className="flex items-start gap-3">
      <div className="bg-rose-100 p-2.5 rounded-xl text-rose-600 shrink-0 mt-0.5">
        <ShieldAlert size={20} />
      </div>
      <div>
        <h3 className="text-rose-700 font-black text-base">Verifikasi Identitas Diperlukan</h3>
        <p className="text-rose-600 text-sm font-medium mt-0.5">
          Status KYC kamu saat ini:{' '}
          <span className="uppercase font-black">{status || 'UNVERIFIED'}</span>.
          Selesaikan verifikasi terlebih dahulu untuk melanjutkan pesanan.
        </p>
      </div>
    </div>
    <button
      onClick={onNavigate}
      className="bg-rose-600 hover:bg-rose-700 text-white font-black px-5 py-2.5 rounded-xl text-sm transition-colors whitespace-nowrap w-full sm:w-auto active:scale-95"
    >
      Verifikasi Sekarang
    </button>
  </div>
);

// [FIX 4] PaymentMethodPicker — nomor rekening diambil dari props (berasal dari API)
// Tidak ada nomor rekening hardcoded di sini
const PaymentMethodPicker = ({ value, onChange, paymentInfo }) => {
  const methods = [
    {
      id:       'bca',
      label:    'Bank BCA',
      // [FIX 4] Nomor dari API, fallback kosong jika API belum diset
      detail:   paymentInfo?.bca?.number
                  ? `No. Rek: ${paymentInfo.bca.number} (a/n ${paymentInfo.bca.name})`
                  : 'Memuat info rekening...',
      icon:     <CreditCard size={20} className="text-blue-700" />,
      badge:    'BCA',
      badgeCls: 'bg-blue-50 text-blue-800 border-blue-200',
    },
    {
      id:       'mandiri',
      label:    'Bank Mandiri',
      detail:   paymentInfo?.mandiri?.number
                  ? `No. Rek: ${paymentInfo.mandiri.number} (a/n ${paymentInfo.mandiri.name})`
                  : 'Memuat info rekening...',
      icon:     <CreditCard size={20} className="text-amber-600" />,
      badge:    'MANDIRI',
      badgeCls: 'bg-amber-50 text-amber-800 border-amber-200',
    },
  ];

  return (
    <div className="space-y-3">
      {methods.map((m) => (
        <label
          key={m.id}
          className={`flex items-center gap-4 p-4 border-2 rounded-2xl cursor-pointer transition-all select-none ${
            value === m.id
              ? 'border-slate-900 bg-slate-50 shadow-sm'
              : 'border-slate-200 hover:border-slate-300 bg-white'
          }`}
        >
          <input
            type="radio"
            name="paymentMethod"
            value={m.id}
            checked={value === m.id}
            onChange={() => onChange(m.id)}
            className="w-4 h-4 accent-slate-900"
          />
          <div className="flex items-center gap-3 flex-1 overflow-hidden">
            <div className="p-2 bg-white border border-slate-100 rounded-xl shadow-sm shrink-0">
              {m.icon}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-slate-900 text-sm">{m.label}</p>
              <p className="text-xs text-slate-500 font-medium truncate">{m.detail}</p>
            </div>
          </div>
          <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg border shrink-0 ${m.badgeCls}`}>
            {m.badge}
          </span>
        </label>
      ))}
    </div>
  );
};

/** Promo Code Input */
const PromoInput = ({ onApply, appliedPromo, onRemove, discountAmount, isChecking }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const handleApply = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setError('');
    const result = await onApply(trimmed);
    if (!result.success) {
      setError(result.error || 'Kode promo tidak valid.');
    } else {
      setCode('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleApply();
  };

  if (appliedPromo) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center">
            <CheckCircle2 size={18} className="text-white" />
          </div>
          <div>
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-0.5">Promo Aktif</p>
            <p className="font-black text-emerald-900 font-mono">{appliedPromo.code}</p>
            {discountAmount > 0 && (
              <p className="text-xs text-emerald-600 font-medium">Hemat {fmtRp(discountAmount)}</p>
            )}
          </div>
        </div>
        <button
          onClick={onRemove}
          className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
          aria-label="Hapus promo"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(''); }}
          onKeyDown={handleKeyDown}
          placeholder="Masukkan kode promo..."
          className={`flex-1 px-4 py-3 border rounded-xl text-sm font-bold uppercase focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all ${
            error ? 'border-rose-300 bg-rose-50/50' : 'border-slate-200 bg-white'
          }`}
          disabled={isChecking}
          maxLength={20}
        />
        <button
          onClick={handleApply}
          disabled={isChecking || !code.trim()}
          className="px-5 py-3 bg-slate-900 text-white rounded-xl text-xs font-black hover:bg-rose-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shrink-0"
        >
          {isChecking ? <Loader2 size={14} className="animate-spin" /> : <Tag size={14} />}
          <span>{isChecking ? 'Cek...' : 'Pasang'}</span>
        </button>
      </div>
      {error && (
        <p className="text-rose-600 text-xs font-bold flex items-center gap-1.5 px-1">
          <XCircle size={12} /> {error}
        </p>
      )}
    </div>
  );
};

/** Price Breakdown Row */
const PriceRow = ({ label, value, isDiscount, isBold, isTotal }) => (
  <div className={`flex justify-between items-center ${isBold || isTotal ? 'font-black' : 'font-medium'} ${isTotal ? 'text-base' : 'text-sm'}`}>
    <span className={isDiscount ? 'text-emerald-700' : isTotal ? 'text-slate-900' : 'text-slate-600'}>
      {label}
    </span>
    <span className={isDiscount ? 'text-emerald-700' : isTotal ? 'text-slate-900' : 'text-slate-700'}>
      {isDiscount ? `− ${fmtRp(value)}` : fmtRp(value)}
    </span>
  </div>
);

/** Loading overlay during payment processing */
const ProcessingOverlay = () => (
  <div className="fixed inset-0 bg-slate-900/85 z-[100] backdrop-blur-sm flex flex-col items-center justify-center text-white px-4">
    <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
      <div className="w-16 h-16 bg-rose-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
        <Loader2 size={32} className="text-rose-500 animate-spin" />
      </div>
      <h2 className="text-xl font-black text-slate-900 mb-2">Memproses Pesanan</h2>
      <p className="text-slate-500 text-sm font-medium">
        Mohon jangan tutup atau muat ulang halaman ini. Pesanan kamu sedang dikonfirmasi.
      </p>
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CheckoutMotor() {
  const { user } = useContext(AuthContext) || {};
  const location = useLocation();
  const navigate  = useNavigate();

  const bookingData = location.state;

  const [paymentMethod, setPaymentMethod]   = useState('bca');
  const [appliedPromo, setAppliedPromo]     = useState(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [isCheckingPromo, setIsCheckingPromo] = useState(false);
  const [isSubmitting, setIsSubmitting]     = useState(false);
  const [submitError, setSubmitError]       = useState('');

  // Delivery (pengantaran unit)
  const [handoverMethod, setHandoverMethod] = useState('self'); // self | delivery
  const [deliveryTarget, setDeliveryTarget] = useState('station'); // station | address
  const [stations, setStations] = useState([]);
  const [stationId, setStationId] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [mapsInput, setMapsInput] = useState('');
  const [deliveryQuote, setDeliveryQuote] = useState(null);
  const [deliveryError, setDeliveryError] = useState('');
  const [isDeliveryLoading, setIsDeliveryLoading] = useState(false);

  // [FIX 4] State untuk info rekening dari API
  const [paymentInfo, setPaymentInfo]       = useState(null);
  const [remoteBreakdown, setRemoteBreakdown] = useState(null);
  const [isBreakdownLoading, setIsBreakdownLoading] = useState(false);

  // Redirect if no booking data
  useEffect(() => {
    if (!bookingData) {
      navigate('/', { replace: true });
      return;
    }
    if (!user) {
      sessionStorage.setItem('pending_checkout', JSON.stringify(bookingData));
      navigate('/login', { replace: true });
    }
  }, [bookingData, user, navigate]);

  // [FIX 4] Fetch info rekening dari backend saat komponen mount
  // Nomor rekening tidak hardcoded — diambil dari API yang baca dari .env
  useEffect(() => {
    fetch(`${API_URL}/api/payment-info`)
      .then((r) => r.json())
      .then((data) => { if (data.success) setPaymentInfo(data.data); })
      .catch(() => {/* silent fail — UI tetap jalan, hanya info rekening kosong */});
  }, []);

  // Fetch delivery stations for city (Solo / Yogyakarta)
  useEffect(() => {
    const city = bookingData?.pickupLocation || '';
    if (!city) return;
    fetch(`${API_URL}/api/delivery/stations?city=${encodeURIComponent(city)}`)
      .then((r) => r.json())
      .then((j) => {
        if (j?.success && Array.isArray(j.data)) {
          setStations(j.data);
          const free = j.data.find((s) => s.is_free);
          if (free?.id) setStationId(free.id);
        }
      })
      .catch(() => {});
  }, [bookingData?.pickupLocation]);

  // ── Price Calculations ──────────────────────────────────────────────────────
  const {
    motorName     = 'Motor',
    pickupLocation = 'Lokasi tidak diketahui',
    startDate     = '',
    startTime     = '09:00',
    endDate       = '',
    endTime       = '09:00',
    price24h      = 0,
    price12h      = Math.round((Number(price24h) || 0) * 0.7),
  } = bookingData || {};

  // Local fallback (kalau backend preview gagal)
  const localBreakdown = calculateMotorRentalBreakdown({
    startDate,
    startTime,
    endDate,
    endTime,
    price24h,
    price12h,
  });

  // Backend preview (source of truth) untuk pricing
  useEffect(() => {
    let isMounted = true;

    if (!bookingData) {
      setRemoteBreakdown(null);
      setIsBreakdownLoading(false);
      return () => { isMounted = false; };
    }

    setIsBreakdownLoading(true);
    fetch(`${API_URL}/api/pricing/motor-breakdown`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startDate,
        startTime,
        endDate,
        endTime,
        price24h,
        price12h,
      }),
    })
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        if (!isMounted) return;
        if (ok && j?.success && j?.data) setRemoteBreakdown(j.data);
        else setRemoteBreakdown(null);
      })
      .catch(() => { if (isMounted) setRemoteBreakdown(null); })
      .finally(() => { if (isMounted) setIsBreakdownLoading(false); });

    return () => { isMounted = false; };
  }, [API_URL, startDate, startTime, endDate, endTime, price24h, price12h]);

  const rentalBreakdown = remoteBreakdown || localBreakdown;

  const subTotal      = rentalBreakdown?.isValid ? rentalBreakdown.baseTotal : 0;
  const serviceFee    = SERVICE_FEE;
  const beforeDiscount = subTotal + serviceFee;
  const safeDiscount  = Math.min(Math.max(0, Number(discountAmount) || 0), beforeDiscount);
  const deliveryFee =
    handoverMethod === 'delivery'
      ? (Number(deliveryQuote?.fee) || 0)
      : 0;
  const grandTotal    = Math.max(0, beforeDiscount - safeDiscount + deliveryFee);

  const isKycVerified = user?.kyc_status === 'verified';

  const requestDeliveryQuote = useCallback(async (target) => {
    setIsDeliveryLoading(true);
    setDeliveryError('');
    try {
      const res = await fetch(`${API_URL}/api/delivery/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city: pickupLocation, target }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || 'Gagal menghitung biaya pengantaran.');
      }
      setDeliveryQuote(json.data);
      return json.data;
    } catch (e) {
      setDeliveryQuote(null);
      setDeliveryError(e.message || 'Gagal menghitung biaya pengantaran.');
      return null;
    } finally {
      setIsDeliveryLoading(false);
    }
  }, [pickupLocation]);

  const parsedLatLng = parseLatLngFromText(mapsInput);

  // Auto quote when user pastes maps link/coords (no Google API needed)
  useEffect(() => {
    if (handoverMethod !== 'delivery') return;
    if (deliveryTarget !== 'address') return;
    if (!parsedLatLng) return;

    const t = setTimeout(() => {
      requestDeliveryQuote({
        type: 'address',
        lat: parsedLatLng.lat,
        lng: parsedLatLng.lng,
        address: deliveryAddress || null,
      });
    }, 700);

    return () => clearTimeout(t);
  }, [handoverMethod, deliveryTarget, parsedLatLng?.lat, parsedLatLng?.lng, deliveryAddress, requestDeliveryQuote]);

  // Auto quote for station-free delivery
  useEffect(() => {
    if (handoverMethod !== 'delivery') {
      setDeliveryQuote(null);
      setDeliveryError('');
      return;
    }
    if (deliveryTarget === 'station' && stationId) {
      requestDeliveryQuote({ type: 'station', station_id: stationId });
    } else {
      setDeliveryQuote(null);
    }
  }, [handoverMethod, deliveryTarget, stationId, requestDeliveryQuote]);

  // ── Promo Handler ───────────────────────────────────────────────────────────
  const handleApplyPromo = useCallback(async (code) => {
    setIsCheckingPromo(true);
    try {
      const res = await fetch(`${API_URL}/api/promotions/validate`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ code }),
      });
      const result = await res.json();

      if (result.success && result.data) {
        const promo = result.data;
        const rawDiscount = Math.floor((subTotal * (promo.discount_percent || 0)) / 100);
        const capped = promo.max_discount > 0 ? Math.min(rawDiscount, promo.max_discount) : rawDiscount;
        setAppliedPromo(promo);
        setDiscountAmount(capped);
        return { success: true };
      } else {
        return { success: false, error: result.error || 'Kode promo tidak valid.' };
      }
    } catch {
      return { success: false, error: 'Gagal terhubung ke server.' };
    } finally {
      setIsCheckingPromo(false);
    }
  }, [subTotal]);

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setDiscountAmount(0);
  };

  // ── Submit Handler ──────────────────────────────────────────────────────────
  const handleCheckout = async () => {
    if (!isKycVerified || !rentalBreakdown?.isValid) return;
    setSubmitError('');
    setIsSubmitting(true);

    const deliveryType =
      handoverMethod === 'delivery'
        ? (deliveryTarget === 'station' ? 'station' : 'address')
        : 'self';

    let destLat = null;
    let destLng = null;

    if (handoverMethod === 'delivery' && deliveryTarget === 'address') {
      const parsed = parseLatLngFromText(mapsInput);
      if (!parsed) {
        setSubmitError('Tempel link Google Maps atau koordinat (lat,lng) untuk menghitung ongkir.');
        setIsSubmitting(false);
        return;
      }
      destLat = parsed.lat;
      destLng = parsed.lng;

      // Ensure quote exists for this address
      if (!deliveryQuote || Number(deliveryQuote?.fee) < 0) {
        const q = await requestDeliveryQuote({
          type: 'address',
          lat: destLat,
          lng: destLng,
          address: deliveryAddress || null,
        });
        if (!q) {
          setIsSubmitting(false);
          return;
        }
      }
    }

    const token   = localStorage.getItem('token');
    const orderId = generateOrderId();

    const startIso = rentalBreakdown.startAtIso || (rentalBreakdown.startAt ? new Date(rentalBreakdown.startAt).toISOString() : null);
    const endIso = rentalBreakdown.endAtIso || (rentalBreakdown.endAt ? new Date(rentalBreakdown.endAt).toISOString() : null);

    const payload = {
      order_id:        orderId,
      item_type:       'motor',
      item_name:       motorName,
      location:        pickupLocation,
      delivery_type:   deliveryType,
      delivery_station_id: deliveryType === 'station' ? stationId : null,
      delivery_address: deliveryType === 'address' ? (deliveryAddress || null) : null,
      delivery_lat:    deliveryType === 'address' ? destLat : null,
      delivery_lng:    deliveryType === 'address' ? destLng : null,
      delivery_distance_km: deliveryType !== 'self' ? (deliveryQuote?.distance_km ?? null) : null,
      delivery_method: deliveryType !== 'self' ? (deliveryQuote?.method ?? null) : null,
      delivery_fee:    deliveryFee,
      start_date:      startIso ? startIso : formatDateTimeForInput(rentalBreakdown.startAt),
      end_date:        endIso ? endIso : formatDateTimeForInput(rentalBreakdown.endAt),
      duration_hours:  rentalBreakdown.billableHours,
      base_price:      subTotal,
      service_fee:     serviceFee,
      discount_amount: safeDiscount,
      promo_code:      appliedPromo?.code || null,
      total_price:     grandTotal,
      payment_method:  paymentMethod,
      price_notes:     `Motor billing ${formatBillableSummary(rentalBreakdown.count24h, rentalBreakdown.count12h)}`,
    };

    try {
      const res = await fetch(`${API_URL}/api/bookings`, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || `Gagal membuat pesanan (${res.status})`);
      }

      if (appliedPromo?.code) {
        fetch(`${API_URL}/api/promotions/increment`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body:    JSON.stringify({ code: appliedPromo.code }),
        }).catch(() => {});
      }

      navigate('/transfer-confirmation', {
        state: {
          order_id: orderId,
          item_type: 'motor',
          item_name: motorName,
          total_price: grandTotal,
          payment_method: paymentMethod,
        },
        replace: true,
      });
    } catch (err) {
      setSubmitError(err.message || 'Gagal membuat pesanan. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  if (!bookingData || !user) return null;

  return (
    <div className="bg-slate-50 min-h-screen pt-20 pb-24 font-sans text-slate-900 animate-fade-in-up">
      {isSubmitting && <ProcessingOverlay />}

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold mb-6 transition-colors text-sm"
        >
          <ChevronLeft size={18} /> Kembali ke Pencarian
        </button>

        <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-6">
          Selesaikan Pesanan
        </h1>

        {!isKycVerified && (
          <KycBanner status={user?.kyc_status} onNavigate={() => navigate('/dashboard')} />
        )}

        <div className="flex flex-col lg:flex-row gap-6 items-start">

          {/* ── LEFT COLUMN ── */}
          <div className={`flex-1 space-y-5 min-w-0 ${!isKycVerified ? 'opacity-40 pointer-events-none select-none' : ''}`}>

            {/* Booking Summary Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-slate-900 px-5 py-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-rose-500 rounded-xl flex items-center justify-center shrink-0">
                  <Bike size={20} className="text-white" />
                </div>
                <div>
                  <p className="font-black text-white text-base leading-tight">{motorName}</p>
                  <p className="text-slate-400 text-xs font-medium">Armada Sewa</p>
                </div>
              </div>
              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <MapPin size={16} className="text-rose-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Titik Ambil & Kembali</p>
                    <p className="font-bold text-slate-800 text-sm">{pickupLocation}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar size={16} className="text-rose-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                      Jadwal Booking
                    </p>
                    <p className="font-bold text-slate-800 text-sm">
                      {startDate} {startTime} <span className="text-slate-400 mx-1 font-normal">→</span> {endDate} {endTime}
                    </p>
                    {rentalBreakdown.isValid && (
                      <p className="text-xs text-rose-500 font-black mt-1">{rentalBreakdown.packageSummary}</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="px-5 pb-4 flex flex-wrap gap-2">
                {[
                  { icon: <Users size={12} />, label: '2 Helm SNI' },
                  { icon: <CloudRain size={12} />, label: 'Jas Hujan' },
                ].map((item) => (
                  <span
                    key={item.label}
                    className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg"
                  >
                    {item.icon} {item.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Delivery / Handover */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h3 className="font-black text-slate-900 mb-4 flex items-center gap-2 text-sm uppercase tracking-widest">
                <MapPin size={16} className="text-slate-500" /> Serah Terima Unit
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setHandoverMethod('self')}
                  className={`p-4 rounded-2xl border-2 text-left transition-all active:scale-[0.99] ${
                    handoverMethod === 'self'
                      ? 'border-slate-900 bg-slate-50'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <p className="text-xs font-black text-slate-900">Ambil Sendiri</p>
                  <p className="text-[11px] font-medium text-slate-500 mt-1">Gratis, ambil di titik {pickupLocation}</p>
                </button>

                <button
                  type="button"
                  onClick={() => setHandoverMethod('delivery')}
                  className={`p-4 rounded-2xl border-2 text-left transition-all active:scale-[0.99] ${
                    handoverMethod === 'delivery'
                      ? 'border-slate-900 bg-slate-50'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <p className="text-xs font-black text-slate-900">Minta Diantar</p>
                  <p className="text-[11px] font-medium text-slate-500 mt-1">
                    Gratis untuk stasiun tertentu, di luar itu ada biaya
                  </p>
                </button>
              </div>

              {handoverMethod === 'delivery' && (
                <div className="mt-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setDeliveryTarget('station')}
                      className={`p-4 rounded-2xl border-2 text-left transition-all active:scale-[0.99] ${
                        deliveryTarget === 'station'
                          ? 'border-emerald-600 bg-emerald-50/40'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <p className="text-xs font-black text-slate-900">Stasiun (Gratis)</p>
                      <p className="text-[11px] font-medium text-slate-500 mt-1">Solo: Balapan, Jogja: Lempuyangan</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeliveryTarget('address')}
                      className={`p-4 rounded-2xl border-2 text-left transition-all active:scale-[0.99] ${
                        deliveryTarget === 'address'
                          ? 'border-emerald-600 bg-emerald-50/40'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <p className="text-xs font-black text-slate-900">Alamat Lain</p>
                      <p className="text-[11px] font-medium text-slate-500 mt-1">Rp 15.000 (0-3km) + Rp 5.000/km berikutnya</p>
                    </button>
                  </div>

                  {deliveryTarget === 'station' && (
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pilih Stasiun</p>
                      <select
                        value={stationId}
                        onChange={(e) => setStationId(e.target.value)}
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                      >
                        {stations.length === 0 ? (
                          <option value="">Memuat...</option>
                        ) : (
                          stations.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({s.city})
                            </option>
                          ))
                        )}
                      </select>
                      <p className="text-xs text-emerald-700 font-black mt-2">
                        {isDeliveryLoading ? 'Menghitung...' : `Biaya: ${fmtRp(deliveryFee)} (Gratis)`}
                      </p>
                    </div>
                  )}

                  {deliveryTarget === 'address' && (
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Alamat (opsional)</p>
                        <input
                          value={deliveryAddress}
                          onChange={(e) => setDeliveryAddress(e.target.value)}
                          className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                          placeholder="Contoh: Jl. Malioboro No. 1, Jogja"
                        />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Link Google Maps / Koordinat</p>
                        <input
                          value={mapsInput}
                          onChange={(e) => setMapsInput(e.target.value)}
                          className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                          placeholder="Tempel link Google Maps atau: -7.79,110.37"
                        />
                        <p className="text-[11px] text-slate-500 font-medium mt-1">
                          Tip: di Google Maps tekan tahan lokasi sampai pin muncul, lalu Share → Copy link.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const parsed = parseLatLngFromText(mapsInput);
                          if (!parsed) {
                            setDeliveryError('Koordinat tidak terbaca. Tempel link Google Maps yang berisi pin lokasi.');
                            return;
                          }
                          requestDeliveryQuote({ type: 'address', lat: parsed.lat, lng: parsed.lng, address: deliveryAddress || null });
                        }}
                        disabled={isDeliveryLoading}
                        className="w-full py-3 bg-emerald-600 text-white font-black rounded-xl hover:bg-slate-900 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isDeliveryLoading ? <Loader2 size={16} className="animate-spin" /> : <Wallet size={16} />}
                        Hitung Ulang Estimasi
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setDeliveryError('');
                          if (!navigator?.geolocation) {
                            setDeliveryError('Browser tidak mendukung GPS.');
                            return;
                          }
                          navigator.geolocation.getCurrentPosition(
                            (pos) => {
                              const lat = pos.coords.latitude;
                              const lng = pos.coords.longitude;
                              const text = formatLatLng(lat, lng);
                              setMapsInput(text);
                              requestDeliveryQuote({ type: 'address', lat, lng, address: deliveryAddress || null });
                            },
                            () => setDeliveryError('Gagal mengambil lokasi. Pastikan izin lokasi (GPS) diizinkan.'),
                            { enableHighAccuracy: true, timeout: 8000 }
                          );
                        }}
                        disabled={isDeliveryLoading}
                        className="w-full py-3 bg-white text-slate-900 font-black rounded-xl border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <MapPin size={16} /> Gunakan Lokasi Saya
                      </button>

                      {parsedLatLng && (
                        <p className="text-[11px] text-slate-500 font-medium">
                          Koordinat terbaca: <span className="font-mono font-black">{formatLatLng(parsedLatLng.lat, parsedLatLng.lng)}</span>
                        </p>
                      )}

                      {deliveryQuote && (
                        <div className="bg-white border border-emerald-200 rounded-2xl p-4">
                          <p className="text-xs font-black text-slate-900">
                            Estimasi biaya: <span className="text-emerald-700">{fmtRp(deliveryQuote.fee)}</span>
                          </p>
                          <p className="text-[11px] text-slate-500 font-medium mt-1">
                            Jarak: {deliveryQuote.distance_km} km ({deliveryQuote.method})
                          </p>
                          <p className="text-[11px] text-amber-700 font-bold mt-2">
                            Catatan: estimasi jarak dihitung garis lurus (tanpa Maps API). Biaya final bisa disesuaikan admin.
                          </p>
                        </div>
                      )}

                      {deliveryError && (
                        <p className="text-rose-600 text-xs font-bold flex items-center gap-1.5">
                          <XCircle size={12} /> {deliveryError}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-start gap-2">
                    <Info size={14} className="text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700 font-medium">
                      Biaya pengantaran dihitung otomatis. Admin masih bisa melakukan penyesuaian saat konfirmasi jika ada kondisi khusus.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Renter Info */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h3 className="font-black text-slate-900 mb-4 flex items-center gap-2 text-sm uppercase tracking-widest">
                <Users size={16} className="text-slate-500" /> Data Penyewa
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: 'Nama Lengkap', value: user.name },
                  { label: 'Email', value: user.email },
                  { label: 'No. WhatsApp', value: user.phone || '—' },
                  { label: 'Status KYC', value: user.kyc_status || 'unverified', isStatus: true },
                ].map(({ label, value, isStatus }) => (
                  <div key={label} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                    {isStatus ? (
                      <span className={`inline-flex items-center gap-1 text-xs font-black uppercase px-2 py-0.5 rounded-lg border ${
                        value === 'verified'
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {value === 'verified' ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />}
                        {value}
                      </span>
                    ) : (
                      <p className="font-bold text-slate-800 text-sm truncate">{value}</p>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-3 bg-amber-50 border border-amber-100 rounded-xl p-3 flex items-start gap-2">
                <Info size={14} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 font-medium">
                  Data di atas diambil dari akun kamu. Pastikan nomor WhatsApp aktif untuk menerima konfirmasi dari tim kami.
                </p>
              </div>
            </div>

            {/* Promo Code */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h3 className="font-black text-slate-900 mb-4 flex items-center gap-2 text-sm uppercase tracking-widest">
                <Percent size={16} className="text-slate-500" /> Kode Promo
              </h3>
              <PromoInput
                onApply={handleApplyPromo}
                appliedPromo={appliedPromo}
                onRemove={handleRemovePromo}
                discountAmount={safeDiscount}
                isChecking={isCheckingPromo}
              />
            </div>

            {/* [FIX 4] Payment Method — paymentInfo dari API, bukan hardcoded */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h3 className="font-black text-slate-900 mb-4 flex items-center gap-2 text-sm uppercase tracking-widest">
                <CreditCard size={16} className="text-slate-500" /> Metode Pembayaran
              </h3>
              <PaymentMethodPicker
                value={paymentMethod}
                onChange={setPaymentMethod}
                paymentInfo={paymentInfo}
              />
              <p className="text-xs text-slate-400 font-medium mt-3 flex items-center justify-center gap-1.5">
                <Info size={11} /> Transfer tepat sesuai nominal hingga 3 digit terakhir untuk verifikasi otomatis.
              </p>
            </div>

          </div>

          {/* ── RIGHT COLUMN: Order Summary ── */}
          <div className="w-full lg:w-[360px] shrink-0 sticky top-24">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

              <div className="bg-slate-900 px-5 py-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Ringkasan Pembayaran</p>
                <p className="text-white font-black text-lg">{motorName}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Clock size={12} className="text-slate-400" />
                  <p className="text-slate-400 text-xs font-medium">
                    {rentalBreakdown.isValid ? rentalBreakdown.packageSummary : 'Jadwal belum valid'}
                  </p>
                </div>
              </div>

              <div className="p-5 space-y-3">
                {rentalBreakdown.isValid && rentalBreakdown.dailyBreakdown.map((item) => (
                  <PriceRow
                    key={item.date}
                    label={`Sewa ${item.date} (${item.packageLabel})`}
                    value={item.price}
                  />
                ))}
                <PriceRow label="Biaya layanan & aplikasi" value={serviceFee} />
                {handoverMethod === 'delivery' && (
                  <PriceRow
                    label={deliveryTarget === 'station' ? 'Pengantaran (Stasiun)' : 'Pengantaran'}
                    value={deliveryFee}
                  />
                )}

                {safeDiscount > 0 && appliedPromo && (
                  <PriceRow
                    label={`Diskon promo (${appliedPromo.code})`}
                    value={safeDiscount}
                    isDiscount
                  />
                )}

                <div className="border-t border-slate-100 pt-3">
                  <PriceRow label="Total Pembayaran" value={grandTotal} isBold isTotal />
                </div>
              </div>

              {submitError && (
                <div className="mx-5 mb-3 bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-2">
                  <XCircle size={14} className="text-rose-500 shrink-0 mt-0.5" />
                  <p className="text-rose-700 text-xs font-bold">{submitError}</p>
                </div>
              )}

              <div className="px-5 pb-5">
                {!rentalBreakdown.isValid && (
                  <div className="mb-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <p className="text-amber-700 text-xs font-bold">{rentalBreakdown.error}</p>
                  </div>
                )}
                {isKycVerified ? (
                  <button
                    onClick={handleCheckout}
                    disabled={isSubmitting || !rentalBreakdown.isValid}
                    className="w-full py-4 bg-slate-900 text-white font-black rounded-xl hover:bg-rose-500 transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                  >
                    {isSubmitting ? (
                      <><Loader2 size={18} className="animate-spin" /> Memproses...</>
                    ) : (
                      <><CheckCircle2 size={18} /> Bayar Sekarang</>
                    )}
                  </button>
                ) : (
                  <button
                    disabled
                    className="w-full py-4 bg-slate-200 text-slate-400 font-black rounded-xl cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                  >
                    <ShieldAlert size={18} /> Verifikasi KYC Dulu
                  </button>
                )}
                <p className="text-center text-[10px] font-medium text-slate-400 mt-3">
                  Dengan melanjutkan, kamu menyetujui Syarat & Ketentuan Brother Trans.
                </p>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-center gap-4">
              {['Transfer Aman', 'Data Terenkripsi', 'Terpercaya'].map((t) => (
                <span key={t} className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                  <CheckCircle2 size={10} className="text-green-500" /> {t}
                </span>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
