import React from 'react';

export default function FaqSection({ title = 'FAQ', faqs = [] }) {
  const list = Array.isArray(faqs) ? faqs.filter((f) => f?.q && f?.a) : [];
  if (list.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-lg md:text-xl font-black text-slate-900">{title}</h2>
      <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 overflow-hidden bg-white">
        {list.map((f, idx) => (
          <details key={`${idx}-${f.q}`} className="group p-4">
            <summary className="cursor-pointer list-none font-black text-slate-900 flex items-start justify-between gap-4">
              <span>{f.q}</span>
              <span className="text-slate-400 group-open:rotate-45 transition-transform">+</span>
            </summary>
            <div className="mt-2 text-sm text-slate-600 font-medium leading-relaxed">{f.a}</div>
          </details>
        ))}
      </div>
    </section>
  );
}

