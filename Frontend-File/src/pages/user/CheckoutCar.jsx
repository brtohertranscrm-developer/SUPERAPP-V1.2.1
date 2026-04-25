import React, { useContext, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CarFront, ArrowLeft, Loader2 } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';

const rupiah = (v) => {
  const n = Number(v) || 0;
  try {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
  } catch {
    return `Rp ${n.toLocaleString('id-ID')}`;
  }
};

const calcDays = (start, end) => {
  const s = new Date(start);
  const e = new Date(end);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e <= s) return 1;
  const ms = e - s;
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
};

export default function CheckoutCar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useContext(AuthContext) || {};

  const bookingData = location.state;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const API_URL = import.meta.env.VITE_API_URL?.trim() || '';

  useEffect(() => {
    if (!bookingData) {
      navigate('/mobil', { replace: true });
      return;
    }
    if (!user) {
      sessionStorage.setItem('pending_checkout', JSON.stringify({ ...bookingData, checkout_path: '/checkout-mobil', item_type: 'car' }));
      navigate('/login', { replace: true });
    }
  }, [bookingData, user, navigate]);

  const computed = useMemo(() => {
    const days = calcDays(bookingData?.startDate, bookingData?.endDate);
    const basePrice = Number(bookingData?.basePrice) || 0;
    const subTotal = basePrice * days;
    const serviceFee = 2500;
    const grandTotal = subTotal + serviceFee;
    return { days, basePrice, subTotal, serviceFee, grandTotal };
  }, [bookingData]);

  if (!bookingData || !user) return null;

  const handleSubmit = async () => {
    setSubmitError('');
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        sessionStorage.setItem('pending_checkout', JSON.stringify({ ...bookingData, checkout_path: '/checkout-mobil', item_type: 'car' }));
        navigate('/login', { replace: true });
        return;
      }

      const date = new Date();
      const orderId = `BTC-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

      const payload = {
        order_id: orderId,
        item_type: 'car',
        item_name: bookingData.carName || 'Mobil',
        car_id: bookingData.carId,
        location: bookingData.pickupCity,
        start_date: bookingData.startDate,
        end_date: bookingData.endDate,
        base_price: computed.subTotal,
        service_fee: computed.serviceFee,
        discount_amount: 0,
        promo_code: null,
        total_price: computed.grandTotal,
        payment_method: 'transfer',
      };

      const res = await fetch(`${API_URL}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        setSubmitError(data?.error || `Gagal membuat booking (HTTP ${res.status}).`);
        setIsSubmitting(false);
        return;
      }

      navigate('/dashboard', { replace: true, state: { successMessage: 'Booking mobil berhasil dibuat. Tim kami akan memproses unitnya.' } });
    } catch (e) {
      setSubmitError(e?.message || 'Koneksi ke server gagal.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20 text-slate-900 font-sans">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <button
          type="button"
          onClick={() => navigate('/mobil')}
          className="inline-flex items-center gap-2 text-sm font-black text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft size={16} /> Kembali
        </button>

        <div className="mt-4 bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-2xl font-black truncate">{bookingData.carName || 'Mobil'}</div>
              <div className="mt-1 text-sm text-slate-500 font-bold">
                Pickup: <span className="text-rose-600">{bookingData.pickupCity || '-'}</span>
              </div>
              <div className="mt-1 text-xs text-slate-400 font-bold">
                {bookingData.startDate} → {bookingData.endDate}
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shrink-0">
              <CarFront size={22} />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Durasi</div>
              <div className="mt-1 text-lg font-black">{computed.days} hari</div>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Harga / hari</div>
              <div className="mt-1 text-lg font-black">{rupiah(computed.basePrice)}</div>
            </div>
          </div>

          <div className="mt-6 bg-white rounded-2xl border border-slate-200 p-4">
            <div className="flex justify-between text-sm font-bold text-slate-600">
              <span>Subtotal</span>
              <span>{rupiah(computed.subTotal)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-slate-600 mt-2">
              <span>Biaya Admin</span>
              <span>{rupiah(computed.serviceFee)}</span>
            </div>
            <div className="h-px bg-slate-100 my-3" />
            <div className="flex justify-between text-base font-black text-slate-900">
              <span>Total</span>
              <span>{rupiah(computed.grandTotal)}</span>
            </div>
          </div>

          {submitError ? (
            <div className="mt-4 bg-rose-50 border border-rose-100 text-rose-700 rounded-2xl p-4 text-sm font-bold">
              {submitError}
            </div>
          ) : null}

          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit}
            className={`mt-5 w-full px-6 py-4 rounded-2xl font-black transition flex items-center justify-center gap-2 ${
              isSubmitting ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-slate-800'
            }`}
          >
            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : null}
            Konfirmasi Booking Mobil
          </button>
        </div>
      </div>
    </div>
  );
}

