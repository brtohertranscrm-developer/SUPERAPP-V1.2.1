import React, { useState, useEffect } from 'react';
import { ChevronLeft, Wallet, Tag, ShieldAlert } from 'lucide-react';
import { useCheckoutMotor } from '../../hooks/useCheckoutMotor';
import RenterForm from '../../components/user/checkout/RenterForm';
import OrderSummary from '../../components/user/checkout/OrderSummary';

export default function CheckoutMotor() {
  const {
    isReady, user, navigate, bookingData, isLoading,
    paymentMethod, setPaymentMethod,
    subTotal, adminFee, insuranceFee, grandTotal,
    handleCheckout
  } = useCheckoutMotor();

  // === 1. STATE UNTUK FITUR PROMO ===
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [promoError, setPromoError] = useState('');
  const [isCheckingPromo, setIsCheckingPromo] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

  // === 2. TAHAP GAMIFIKASI ONBOARDING OTOMATIS ===
  useEffect(() => {
    // Deteksi: Jika user login, miles di bawah 1000, dan belum ada promo yang terpasang
    if (user && user.miles < 1000 && !appliedPromo) {
      setAppliedPromo({
        code: 'ONBOARDING',
        discount_percent: 5, // Diskon 5%
        max_discount: 5000   // Maksimal diskon Rp 5.000
      });
    }
  }, [user]);

  // === 3. FUNGSI VALIDASI KODE PROMO ===
  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setIsCheckingPromo(true);
    setPromoError('');

    try {
      const res = await fetch(`${API_URL}/api/promotions/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoCode })
      });
      const result = await res.json();

      if (result.success) {
        setAppliedPromo(result.data);
        setPromoError('');
        setPromoCode(''); // Kosongkan input setelah berhasil
      } else {
        setPromoError(result.message);
        setAppliedPromo(null);
      }
    } catch (err) {
      setPromoError('Gagal memproses kode promo. Cek koneksi server Anda.');
      setAppliedPromo(null);
    } finally {
      setIsCheckingPromo(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoCode('');
    setPromoError('');
  };

  // === 4. LOGIKA KALKULASI HARGA DISKON ===
  const calculateDiscount = () => {
    if (!appliedPromo) return 0;
    // Diskon dihitung dari subTotal (harga sewa murni)
    let discount = (subTotal * appliedPromo.discount_percent) / 100;
    return Math.min(discount, appliedPromo.max_discount); 
  };

  const discountAmount = calculateDiscount();
  const finalPrice = grandTotal - discountAmount;

  // === 5. LOGIKA PROTEKSI KYC & INCREMENT PROMO ===
  const isKycVerified = user?.kyc_status === 'verified';

  // Ubah fungsi ini menjadi async untuk menangani API increment
  const handleSecureCheckout = async () => {
    if (!isKycVerified) {
      alert("Harap verifikasi identitas (KYC) Anda terlebih dahulu untuk dapat melanjutkan.");
      return;
    }
    
    // 1. Eksekusi proses checkout bawaan (Kirim data diskon ke hook)
    await handleCheckout({
      discountAmount: discountAmount,
      appliedPromo: appliedPromo,
      finalPrice: finalPrice
    });

    // 2. JIKA ADA PROMO TERPASANG, KIRIM SINYAL KE BACKEND UNTUK DITAMBAH 1 PENGGUNAANNYA
    if (appliedPromo) {
      try {
        await fetch(`${API_URL}/api/promotions/increment`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}` // Sisipkan token auth
          },
          body: JSON.stringify({ code: appliedPromo.code })
        });
      } catch (error) {
        console.error("Gagal melacak penggunaan promo:", error);
      }
    }
  };

  if (!isReady) return null;

  return (
    <div className="bg-slate-50 min-h-screen pt-24 pb-20 font-sans text-slate-900 animate-fade-in-up">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Tombol Kembali */}
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold mb-8 transition-colors w-fit">
          <ChevronLeft size={20} /> Kembali ke Pencarian
        </button>

        <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-8">Selesaikan Pesanan Anda</h1>

        {/* --- BANNER PERINGATAN KYC --- */}
        {!isKycVerified && (
          <div className="bg-rose-50 border-2 border-rose-200 rounded-2xl p-5 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-rose-100 p-3 rounded-full text-rose-600">
                <ShieldAlert size={24} />
              </div>
              <div>
                <h3 className="text-rose-700 font-black text-lg">Verifikasi Identitas Diperlukan</h3>
                <p className="text-rose-600 font-medium text-sm mt-1">
                  Status identitas Anda saat ini: <span className="uppercase font-bold">{user?.kyc_status || 'UNVERIFIED'}</span>. Anda tidak dapat melanjutkan pesanan sebelum data diverifikasi oleh Admin.
                </p>
              </div>
            </div>
            {/* PERBAIKAN: path disesuaikan dengan AppRoutes.jsx yaitu '/dashboard' */}
            <button 
              onClick={() => navigate('/dashboard')} 
              className="bg-rose-600 hover:bg-rose-700 text-white font-black px-6 py-3 rounded-xl transition-colors whitespace-nowrap w-full sm:w-auto"
            >
              Verifikasi Sekarang
            </button>
          </div>
        )}

        {/* --- KONTEN UTAMA (Akan blur/tidak bisa di-klik jika KYC belum verified) --- */}
        <div className={`flex flex-col lg:flex-row gap-8 items-start transition-all duration-300 ${!isKycVerified ? 'opacity-50 pointer-events-none grayscale-[30%]' : ''}`}>
          
          {/* KIRI: Formulir Pembayaran & Detail User */}
          <div className="w-full lg:w-2/3">
            <RenterForm 
              user={user} 
              paymentMethod={paymentMethod} 
              setPaymentMethod={setPaymentMethod} 
            />
          </div>

          {/* KANAN: Kolom Promo & Ringkasan Pesanan (Sticky) */}
          <div className="w-full lg:w-1/3 flex flex-col gap-6 sticky top-24">
            
            {/* --- KOTAK INPUT PROMO --- */}
            <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100">
              <h3 className="font-black text-brand-dark flex items-center gap-2 mb-4">
                <Tag size={18} className="text-blue-600"/> Punya Kode Promo?
              </h3>

              {!appliedPromo ? (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                      placeholder="Contoh: MUDIKAMAN"
                      className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold uppercase focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <button 
                      onClick={handleApplyPromo}
                      disabled={isCheckingPromo || !promoCode}
                      className="bg-brand-dark text-white px-5 py-3 rounded-xl text-xs font-black hover:bg-amber-500 transition-colors disabled:opacity-50"
                    >
                      {isCheckingPromo ? 'CEK...' : 'PASANG'}
                    </button>
                  </div>
                  {promoError && <p className="text-red-500 text-[10px] font-bold px-1">{promoError}</p>}
                </div>
              ) : (
                // Tampilan jika promo berhasil terpasang
                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Promo Terpasang</div>
                    <div className="font-bold text-slate-900 text-sm">{appliedPromo.code}</div>
                    <div className="text-xs text-emerald-600 font-medium mt-0.5">Hemat Rp {discountAmount.toLocaleString('id-ID')}</div>
                  </div>
                  <button onClick={handleRemovePromo} className="text-[10px] font-black text-rose-500 hover:text-white hover:bg-rose-500 border border-rose-200 px-3 py-1.5 rounded-lg transition-colors">
                    HAPUS
                  </button>
                </div>
              )}
            </div>

            {/* --- RINGKASAN PESANAN --- */}
            <OrderSummary 
              bookingData={bookingData}
              subTotal={subTotal}
              insuranceFee={insuranceFee}
              adminFee={adminFee}
              grandTotal={finalPrice} 
              isLoading={isLoading}
              handleCheckout={handleSecureCheckout} 
            />

          </div>

        </div>
      </div>

      {/* OVERLAY LOADING PEMBAYARAN */}
      {isLoading && (
        <div className="fixed inset-0 bg-slate-900/80 z-[100] backdrop-blur-sm flex flex-col items-center justify-center text-white">
          <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-6 shadow-2xl animate-bounce">
            <Wallet size={40} className="text-rose-500" />
          </div>
          <h2 className="text-2xl font-black tracking-tight mb-2">Memproses Pembayaran...</h2>
          <p className="text-slate-300 font-medium">Mohon jangan tutup atau muat ulang halaman ini.</p>
        </div>
      )}

    </div>
  );
}