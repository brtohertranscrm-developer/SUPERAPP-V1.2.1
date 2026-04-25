import React from 'react';
import {
  CheckCircle2,
  Clock,
  Loader2,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import PriceRow from './PriceRow';

export default function CheckoutAside({
  checkoutStep,
  motorName,
  rentalBreakdown,
  serviceFee,
  handoverMethod,
  deliveryTarget,
  deliveryFee,
  addonItems,
  motorAddons,
  safeDiscount,
  appliedPromo,
  grandTotal,
  submitError,
  isKycVerified,
  handleCheckout,
  isSubmitting,
}) {
  return (
    <div className="hidden lg:block w-full lg:w-[360px] shrink-0 sticky top-24">
      {checkoutStep === 'payment' ? (
        <>
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

              {addonItems.length > 0 && (
                <div className="pt-1">
                  {addonItems.map((it) => {
                    const row = motorAddons.find((a) => Number(a.id) === Number(it.id));
                    if (!row) return null;
                    const qty = Number(it.qty) || 1;
                    const line = (Number(row.price) || 0) * qty;
                    return (
                      <PriceRow
                        key={`addon-${it.id}`}
                        label={`${row.name}${qty > 1 ? ` x${qty}` : ''}`}
                        value={line}
                      />
                    );
                  })}
                </div>
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
                  type="button"
                >
                  {isSubmitting ? (
                    <><Loader2 size={18} className="animate-spin" /> Memproses...</>
                  ) : (
                    <><CheckCircle2 size={18} /> Buat Pesanan &amp; Lanjut Transfer</>
                  )}
                </button>
              ) : (
                <button
                  disabled
                  className="w-full py-4 bg-slate-200 text-slate-400 font-black rounded-xl cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                  type="button"
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
        </>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-900 px-5 py-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Ringkasan Pembayaran</p>
            <p className="text-white font-black text-lg">{motorName}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <Clock size={12} className="text-slate-400" />
              <p className="text-slate-400 text-xs font-medium">
                {rentalBreakdown.isValid ? rentalBreakdown.packageSummary : 'Lengkapi jadwal untuk lihat ringkasan'}
              </p>
            </div>
          </div>
          <div className="p-5">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <p className="text-slate-700 text-sm font-black">Total & tombol pembayaran ada di langkah terakhir.</p>
              <p className="text-slate-500 text-xs font-medium mt-1">
                Lanjutkan isi form sampai step <span className="font-black text-slate-900">Pembayaran</span>.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

