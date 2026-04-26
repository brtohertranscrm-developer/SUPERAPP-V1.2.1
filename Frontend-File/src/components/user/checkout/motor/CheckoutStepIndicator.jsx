import React from 'react';

export default function CheckoutStepIndicator({ steps, activeKey }) {
  const stepKeys = (steps || []).map((s) => s.key);
  const currentStepIdx = Math.max(0, stepKeys.indexOf(activeKey));

  return (
    <div className="mb-6">
      <div className="flex items-center justify-center">
        <div className="flex items-center w-full max-w-xl flex-nowrap">
        {(steps || []).map((s, i) => {
          const isDone = i < currentStepIdx;
          const isCurrent = i === currentStepIdx;
          return (
            <React.Fragment key={s.key}>
              {i > 0 && <div className={`h-px flex-1 mx-2 ${isDone ? 'bg-slate-900' : 'bg-slate-200'}`} />}
              <div
                className={`flex items-center gap-2 text-xs font-bold shrink-0 ${
                  isCurrent ? 'text-slate-900' : isDone ? 'text-emerald-600' : 'text-slate-400'
                }`}
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                  isDone ? 'bg-emerald-600 text-white' : isCurrent ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-500'
                }`}>
                  {isDone ? '✓' : i + 1}
                </div>
                <span className="hidden sm:inline whitespace-nowrap">{s.label}</span>
              </div>
            </React.Fragment>
          );
        })}
        </div>
      </div>
      <div className="mt-2 text-center text-[11px] font-bold text-slate-500">
        Step aktif: <span className="text-slate-900">{steps?.[currentStepIdx]?.label}</span>
      </div>
    </div>
  );
}
