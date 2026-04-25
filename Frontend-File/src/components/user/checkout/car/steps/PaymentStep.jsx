import React from 'react';
import {
  CheckCircle2,
  CreditCard,
  Info,
  Loader2,
  Percent,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import PromoInput from '../../motor/PromoInput';
import PaymentMethodPicker from '../../motor/PaymentMethodPicker';
import { fmtRp } from '../checkoutCarUtils';

export default function PaymentStep({
  paymentMethod,
  setPaymentMethod,
  paymentInfo,
  handleApplyPromo,
  appliedPromo,
  handleRemovePromo,
  safeDiscount,
  isCheckingPromo,
  grandTotal,
  submitError,
  isKycVerified,
  handleCheckout,
  isSubmitting,
  goPrevStep,
}) {
  return (
    <>
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

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <h3 className="font-black text-slate-900 mb-4 flex items-center gap-2 text-sm uppercase tracking-widest">
          <CreditCard size={16} className="text-slate-500" /> Metode Pembayaran
        </h3>
        <PaymentMethodPicker value={paymentMethod} onChange={setPaymentMethod} paymentInfo={paymentInfo} />
        <p className="text-xs text-slate-400 font-medium mt-3 flex items-center justify-center gap-1.5">
          <Info size={11} /> Transfer tepat sesuai nominal hingga 3 digit terakhir untuk verifikasi otomatis.
        </p>
      </div>

      <div className="lg:hidden bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-900 px-5 py-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Total Pembayaran</p>
          <p className="text-white font-black text-2xl">{fmtRp(grandTotal)}</p>
        </div>
        {submitError && (
          <div className="mx-5 mt-4 bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-2">
            <XCircle size={14} className="text-rose-500 shrink-0 mt-0.5" />
            <p className="text-rose-700 text-xs font-bold">{submitError}</p>
          </div>
        )}
        <div className="px-5 py-5">
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
          <button
            type="button"
            onClick={goPrevStep}
            className="mt-3 w-full py-3 rounded-xl bg-white text-slate-700 font-black border border-slate-200 hover:bg-slate-50"
          >
            Kembali
          </button>
          <p className="text-center text-[10px] font-medium text-slate-400 mt-3">
            Dengan melanjutkan, kamu menyetujui Syarat &amp; Ketentuan Brother Trans.
          </p>
        </div>
      </div>
    </>
  );
}

