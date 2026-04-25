import React from 'react';
import { Link } from 'react-router-dom';

export default function LegalPageShell({
  title,
  lastUpdatedLabel,
  summaryItems,
  badges,
  helpCta,
  children,
}) {
  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 text-sm text-slate-500 font-medium">
          <Link to="/" className="hover:text-slate-900">Home</Link>
          <span className="mx-2 text-slate-300">/</span>
          <span className="text-slate-700 font-bold">{title}</span>
        </div>

        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{title}</h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-2">
                Berlaku sejak <span className="font-black text-slate-700">{lastUpdatedLabel}</span>
              </p>
            </div>
            <div className="text-[11px] text-slate-400 font-bold">
              Ringkasnya dulu, detail menyusul di bawah.
            </div>
          </div>

          {Array.isArray(summaryItems) && summaryItems.length > 0 && (
            <div className="mt-6 rounded-2xl bg-slate-50 border border-slate-200 p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">Ringkasnya</p>
              <ul className="space-y-2">
                {summaryItems.map((t) => (
                  <li key={t} className="text-sm text-slate-700 font-medium leading-relaxed flex items-start gap-2">
                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {Array.isArray(badges) && badges.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {badges.map((b) => (
                <span
                  key={b}
                  className="px-3 py-1 rounded-full bg-white border border-slate-200 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600"
                >
                  {b}
                </span>
              ))}
            </div>
          )}

          <div className="mt-8 space-y-4">{children}</div>

          {helpCta?.href && (
            <div className="mt-10 rounded-2xl bg-slate-900 text-white p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-sm font-black">Butuh bantuan atau ada pertanyaan?</p>
                <p className="text-xs text-slate-300 font-medium mt-1">{helpCta.description || 'Hubungi kami, kami bantu.'}</p>
              </div>
              <a
                href={helpCta.href}
                target="_blank"
                rel="noreferrer"
                className="px-5 py-3 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-black text-sm text-center"
              >
                {helpCta.label || 'Chat Admin (WA)'}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
