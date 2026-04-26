import React, { useEffect, useMemo, useRef, useState } from 'react';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() || '';

export default function GoogleSignInButton({ onCredential, text = 'continue_with', disabled = false }) {
  const ref = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [buttonWidth, setButtonWidth] = useState(360);

  const buttonCfg = useMemo(() => ({
    type: 'standard',
    theme: 'outline',
    size: 'large',
    text,
    shape: 'pill',
    width: buttonWidth,
  }), [text, buttonWidth]);

  useEffect(() => {
    if (!ref.current) return;

    const host = ref.current;
    const target = host.parentElement || host;

    const compute = () => {
      const w = target?.clientWidth || host.clientWidth || 360;
      const next = Math.max(240, Math.min(360, Math.floor(w)));
      setButtonWidth((prev) => (prev === next ? prev : next));
    };

    compute();

    let ro = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => compute());
      ro.observe(target);
    }

    window.addEventListener('resize', compute);
    return () => {
      window.removeEventListener('resize', compute);
      if (ro) ro.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!CLIENT_ID) return;
    const g = window.google;
    if (!g?.accounts?.id) return;
    if (!ref.current) return;
    if (disabled) return;

    try {
      g.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: (resp) => {
          if (!resp?.credential) return;
          onCredential?.(resp.credential);
        },
      });
      ref.current.innerHTML = '';
      g.accounts.id.renderButton(ref.current, buttonCfg);
      const host = ref.current;
      const mo = new MutationObserver(() => {
        if (host.childNodes?.length) {
          setIsReady(true);
          mo.disconnect();
        }
      });
      mo.observe(host, { childList: true, subtree: true });
      // Fallback jika renderButton tidak memicu mutation (jarang)
      setTimeout(() => {
        if (host.childNodes?.length) setIsReady(true);
      }, 200);
    } catch (e) {
      console.warn('Google Sign-In init gagal:', e?.message || e);
    }
  }, [buttonCfg, disabled, onCredential]);

  if (!CLIENT_ID) return null;

  return (
    <div className="w-full">
      <div
        ref={ref}
        className={`w-full flex justify-center ${disabled ? 'pointer-events-none opacity-50' : ''}`}
      />
      {!isReady && (
        <p className="text-[10px] text-slate-400 font-bold text-center mt-2">
          Memuat login Google...
        </p>
      )}
    </div>
  );
}
