import React from 'react';
import { CheckCircle2, Loader2, ShieldAlert, XCircle } from 'lucide-react';
import { fmtRp } from './checkoutCarUtils';

export default function CheckoutAsideCar({
  checkoutStep,
  carName,
  computed,
  safeDiscount,
  appliedPromo,
  grandTotal,
  submitError,
  isKycVerified,
  handleCheckout,
  isSubmitting,
}) {
  const beforeDiscount = Number(computed?.beforeDiscount) || 0;
  return (
    <div className="hidden lg:block w-full lg:w-[360px] shrink-0 sticky top-24">
      {checkoutStep === 'payment' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-900 px-5 py-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Ringkasan Pembayaran</p>
            <p className="text-white font-black text-lg">{carName}</p>
            <p className="text-slate-400 text-xs font-medium mt-1">{computed?.days || 1} hari</p>
          </div>

          <div className="p-5 space-y-2">
            <div className="flex justify-between text-sm font-bold text-slate-600">
              <span>Subtotal</span>
              <span>{fmtRp(computed?.subTotal)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-slate-600">
              <span>Biaya layanan & aplikasi</span>
              <span>{fmtRp(computed?.serviceFee)}</span>
            </div>
            {safeDiscount > 0 && appliedPromo && (
              <div className="flex justify-between text-sm font-bold text-emerald-700">
                <span>Diskon promo ({appliedPromo.code})</span>
                <span>-{fmtRp(safeDiscount)}</span>
              </div>
            )}
            <div className="border-t border-slate-100 pt-3 flex justify-between text-base font-black text-slate-900">
              <span>Total</span>
              <span>{fmtRp(grandTotal)}</span>
            </div>
            {beforeDiscount !== grandTotal && safeDiscount > 0 ? (
              <p className="text-[11px] text-slate-400 font-bold">
                Sebelum diskon: {fmtRp(beforeDiscount)}
              </p>
            ) : null}
          </div>

          {submitError && (
            <div className="mx-5 mb-3 bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-2">
              <XCircle size={14} className="text-rose-500 shrink-0 mt-0.5" />
              <p className="text-rose-700 text-xs font-bold">{submitError}</p>
            </div>
          )}

          <div className="px-5 pb-5">
            {isKycVerified ? (
              <button
                onClick={handleCheckout}
                disabled={isSubmitting}
                className="w-full py-4 bg-slate-900 text-white font-black rounded-xl hover:bg-rose-500 transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                type="button"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> Memproses...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} /> Buat Pesanan &amp; Lanjut Transfer
                  </>
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
              Dengan melanjutkan, kamu menyetujui Syarat &amp; Ketentuan Brother Trans.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-900 px-5 py-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Ringkasan Pembayaran</p>
            <p className="text-white font-black text-lg">{carName}</p>
            <p className="text-slate-400 text-xs font-medium mt-1">{computed?.days || 1} hari</p>
          </div>
          <div className="p-5">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <p className="text-slate-700 text-sm font-black">Pembayaran ada di langkah terakhir.</p>
              <p className="text-slate-500 text-xs font-medium mt-1">
                Lanjutkan ke step <span className="font-black text-slate-900">Pembayaran</span> untuk lihat rekening &amp; instruksi transfer.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

