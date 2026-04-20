import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Package, Lock, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import { useLockerCatalog, useLockerAddons, useLockerCheckout } from '../../hooks/useLockerCatalog';
import LockerCard from '../../components/public/catalog/LockerCard';
import LockerForm from '../../components/user/checkout/LockerForm';
import LockerSummary from '../../components/user/checkout/LockerSummary';
import { AuthContext } from '../../context/AuthContext';

const STEPS = [
  { key: 'pilih',   label: 'Pilih Loker' },
  { key: 'durasi',  label: 'Durasi & Addon' },
  { key: 'bayar',   label: 'Konfirmasi' }
];

const CheckoutLocker = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  // AMBIL context secara utuh
  const authContext = useContext(AuthContext);
  
  // LOGIKA LOGIN YANG LEBIH AMAN:
  const isLoggedIn = !!(authContext?.user) || !!(localStorage.getItem('token') || localStorage.getItem('admin_token'));

  const preselectedId = location.state?.lockerId || searchParams.get('id');
  const [step, setStep] = useState(preselectedId ? 'durasi' : 'pilih');
  const [selectedLocker, setSelectedLocker] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [orderId, setOrderId] = useState(null);

  const { lockers, isLoading: lockerLoading } = useLockerCatalog();
  const { addons, isLoading: addonsLoading } = useLockerAddons();
  const checkout = useLockerCheckout(selectedLocker);

  // Auto-pilih loker dari query param
  useEffect(() => {
    if (preselectedId && lockers.length > 0) {
      const found = lockers.find(l => l.id === parseInt(preselectedId));
      if (found) { setSelectedLocker(found); setStep('durasi'); }
    }
  }, [preselectedId, lockers]);

  const handleSelectLocker = (locker) => {
    setSelectedLocker(locker);
    setStep('durasi');
  };

  const handleLoginRedirect = () => {
    navigate('/login', { 
        state: { 
            from: '/checkout-loker',
            lockerId: selectedLocker?.id 
        } 
    });
  };

  const handleSubmit = async () => {
    // Double check sebelum kirim request
    if (!isLoggedIn) {
      alert("Sesi login Anda telah berakhir. Silakan login kembali.");
      handleLoginRedirect();
      return;
    }

    const pickupAddon = addons.pickup.find(a => a.id === checkout.form.pickup_addon_id);
    const dropAddon   = addons.drop.find(a   => a.id === checkout.form.drop_addon_id);
    const result = await checkout.submit(pickupAddon?.price, dropAddon?.price);
    
    if (result.success) {
      setOrderId(result.order_id);
      setIsSuccess(true);
    } else {
      alert(result.error || 'Gagal membuat booking.');
    }
  };

  // ==========================================
  // SUCCESS STATE
  // ==========================================
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-emerald-500" />
          </div>
          <h2 className="text-xl font-black text-slate-800 mb-2">Booking Berhasil!</h2>
          <p className="text-slate-500 text-sm mb-1">Order ID kamu:</p>
          <p className="text-lg font-mono font-black text-blue-600 mb-5">{orderId}</p>
          <p className="text-xs text-slate-400 mb-6">
            Simpan Order ID ini untuk mengakses loker. Segera selesaikan pembayaran sesuai metode yang dipilih.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate(`/payment/${orderId}`)}
              className="w-full py-3 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 transition-colors shadow-md"
            >
              Lanjut ke Pembayaran
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors"
            >
              Ke Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // STEP INDICATORS
  // ==========================================
  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEPS.map((s, i) => {
        const stepKeys = STEPS.map(x => x.key);
        const currentIdx = stepKeys.indexOf(step);
        const thisIdx = i;
        const isDone   = thisIdx < currentIdx;
        const isCurrent= thisIdx === currentIdx;
        return (
          <React.Fragment key={s.key}>
            {i > 0 && <div className={`h-px w-8 ${isDone ? 'bg-blue-400' : 'bg-slate-200'}`} />}
            <div className={`flex items-center gap-1.5 text-xs font-bold transition-all ${
              isCurrent ? 'text-blue-600' : isDone ? 'text-emerald-500' : 'text-slate-400'
            }`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                isDone ? 'bg-emerald-500 text-white' : isCurrent ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'
              }`}>
                {isDone ? '✓' : i + 1}
              </div>
              <span className="hidden sm:inline">{s.label}</span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-screen-lg mx-auto px-4 py-8">

        {/* Back button */}
        <button
          onClick={() => step === 'pilih' ? navigate('/loker') : setStep(step === 'bayar' ? 'durasi' : 'pilih')}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 font-bold mb-6 transition-colors"
        >
          <ArrowLeft size={16} /> {step === 'pilih' ? 'Kembali ke Katalog' : 'Kembali'}
        </button>

        <StepIndicator />

        {/* ==================== STEP 1: PILIH LOKER ==================== */}
        {step === 'pilih' && (
          <div className="space-y-6">
            <h1 className="text-xl font-black text-slate-800">Pilih Loker</h1>
            {lockerLoading ? (
              <div className="text-center py-16 text-slate-400 font-bold">Memuat loker...</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {lockers.map(l => (
                  <LockerCard
                    key={l.id}
                    locker={l}
                    isSelected={selectedLocker?.id === l.id}
                    onSelect={handleSelectLocker}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ==================== STEP 2: DURASI & ADDON ==================== */}
        {step === 'durasi' && selectedLocker && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h1 className="text-xl font-black text-slate-800 mb-5">Durasi & Layanan</h1>
              <LockerForm
                locker={selectedLocker}
                addons={addonsLoading ? { pickup: [], drop: [] } : addons}
                form={checkout.form}
                updateForm={checkout.updateForm}
                setDuration={checkout.setDuration}
                pricing={checkout.pricing}
                MIN_HOURS={checkout.MIN_HOURS}
              />
              <div className="mt-6">
                <button
                  onClick={() => setStep('bayar')}
                  disabled={!checkout.pricing.isValid || checkout.form.duration_hours < checkout.MIN_HOURS}
                  className="w-full py-3.5 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 shadow-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Lanjut ke Konfirmasi →
                </button>
              </div>
            </div>

            {/* Summary sidebar */}
            <div className="lg:col-span-2">
              <LockerSummary
                locker={selectedLocker}
                durationHours={checkout.form.duration_hours}
                pricing={checkout.pricing}
                pickupAddon={addons.pickup.find(a => a.id === checkout.form.pickup_addon_id)}
                dropAddon={addons.drop.find(a   => a.id === checkout.form.drop_addon_id)}
                startDate={checkout.form.start_date}
                startTime={checkout.form.start_time}
              />
            </div>
          </div>
        )}

        {/* ==================== STEP 3: KONFIRMASI ==================== */}
        {step === 'bayar' && selectedLocker && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h1 className="text-xl font-black text-slate-800 mb-5">Konfirmasi Booking</h1>

              {/* Info loker terpilih */}
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 mb-5 flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                  {selectedLocker.type === 'tertutup'
                    ? <Lock size={18} className="text-blue-600" />
                    : <Package size={18} className="text-blue-600" />}
                </div>
                <div>
                  <p className="text-sm font-black text-slate-800 capitalize">
                    Rak {selectedLocker.type} — {selectedLocker.location}
                  </p>
                  <p className="text-xs text-slate-500">
                    {checkout.form.duration_hours} jam · {checkout.form.start_date} {checkout.form.start_time}
                  </p>
                </div>
              </div>

              {/* Metode pembayaran */}
              <div className="mb-5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Metode Pembayaran</label>
                <div className="space-y-2">
                  {[
                    { value: 'transfer', label: 'Transfer Bank (BCA / Mandiri)' },
                    { value: 'cash',     label: 'Cash di Lokasi' },
                    { value: 'qris',     label: 'QRIS / E-Wallet' }
                  ].map(m => (
                    <label key={m.value} className={`flex items-center gap-3 p-3 bg-white border-2 rounded-xl cursor-pointer transition-all ${
                      checkout.form.payment_method === m.value ? 'border-blue-400 bg-blue-50/30' : 'border-slate-200 hover:border-slate-300'
                    }`}>
                      <input type="radio" name="payment"
                        checked={checkout.form.payment_method === m.value}
                        onChange={() => checkout.updateForm('payment_method', m.value)}
                        className="shrink-0" />
                      <span className="text-sm font-bold text-slate-700">{m.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* TAMPILAN TOMBOL BERDASARKAN STATUS LOGIN */}
              {isLoggedIn ? (
                <button
                  onClick={handleSubmit}
                  disabled={checkout.isSubmitting}
                  className="w-full py-3.5 bg-emerald-600 text-white font-black rounded-xl hover:bg-emerald-700 shadow-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {checkout.isSubmitting
                    ? <><Loader2 size={18} className="animate-spin" /> Memproses...</>
                    : '✓ Konfirmasi Booking'
                  }
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold rounded-xl text-center">
                    Anda harus login terlebih dahulu untuk menyelesaikan booking.
                  </div>
                  <button
                    onClick={handleLoginRedirect}
                    className="w-full py-3.5 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 shadow-md transition-colors flex items-center justify-center gap-2"
                  >
                    Login untuk Booking Loker
                  </button>
                </div>
              )}

              <p className="text-xs text-slate-400 text-center mt-3">
                Dengan menekan konfirmasi, kamu setuju dengan syarat penggunaan loker Brothers Trans
              </p>
            </div>

            {/* Summary sidebar */}
            <div className="lg:col-span-2">
              <LockerSummary
                locker={selectedLocker}
                durationHours={checkout.form.duration_hours}
                pricing={checkout.pricing}
                pickupAddon={addons.pickup.find(a => a.id === checkout.form.pickup_addon_id)}
                dropAddon={addons.drop.find(a   => a.id === checkout.form.drop_addon_id)}
                startDate={checkout.form.start_date}
                startTime={checkout.form.start_time}
              />
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default CheckoutLocker;