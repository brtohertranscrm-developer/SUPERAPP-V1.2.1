import React from 'react';
import { fmtRp } from './checkoutMotorUtils';

export default function PriceRow({ label, value, isDiscount, isBold, isTotal }) {
  return (
    <div className={`flex justify-between items-center ${isBold || isTotal ? 'font-black' : 'font-medium'} ${isTotal ? 'text-base' : 'text-sm'}`}>
      <span className={isDiscount ? 'text-emerald-700' : isTotal ? 'text-slate-900' : 'text-slate-600'}>
        {label}
      </span>
      <span className={isDiscount ? 'text-emerald-700' : isTotal ? 'text-slate-900' : 'text-slate-700'}>
        {isDiscount ? `− ${fmtRp(value)}` : fmtRp(value)}
      </span>
    </div>
  );
}

