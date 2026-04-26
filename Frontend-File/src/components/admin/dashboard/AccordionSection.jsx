import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';

const readStoredOpen = (key, fallback) => {
  if (!key) return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return raw === '1';
  } catch {
    return fallback;
  }
};

const writeStoredOpen = (key, value) => {
  if (!key) return;
  try {
    localStorage.setItem(key, value ? '1' : '0');
  } catch {
    // Ignore localStorage failures (private mode, quota, etc.)
  }
};

export default function AccordionSection({
  id,
  title,
  subtitle,
  defaultOpen = false,
  keepMounted = false,
  children,
}) {
  const storageKey = useMemo(
    () => (id ? `admin_dashboard_accordion:${String(id)}` : null),
    [id]
  );

  const [isOpen, setIsOpen] = useState(() => readStoredOpen(storageKey, defaultOpen));

  useEffect(() => {
    writeStoredOpen(storageKey, isOpen);
  }, [storageKey, isOpen]);

  return (
    <section className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="w-full px-5 sm:px-6 py-4 flex items-start justify-between gap-4 text-left hover:bg-slate-50 transition-colors"
        aria-expanded={isOpen}
      >
        <div className="min-w-0">
          <div className="text-sm sm:text-base font-black text-slate-900 truncate">
            {title}
          </div>
          {subtitle ? (
            <div className="mt-0.5 text-xs text-slate-500 font-semibold">
              {subtitle}
            </div>
          ) : null}
        </div>
        <ChevronDown
          size={18}
          className={`shrink-0 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {(isOpen || keepMounted) && (
        <div className={isOpen ? 'block' : 'hidden'}>
          <div className="px-5 sm:px-6 pb-6">
            {children}
          </div>
        </div>
      )}
    </section>
  );
}
