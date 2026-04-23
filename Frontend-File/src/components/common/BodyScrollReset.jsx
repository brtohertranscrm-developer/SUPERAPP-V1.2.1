import { useEffect } from 'react';

/**
 * BodyScrollReset
 * Fix mobile "stuck can't scroll" after tab restore (bfcache) or app resume.
 * Some UI (mobile menu/modal) can leave `document.body.style.overflow = 'hidden'`
 * when the browser restores the page without re-running React mount effects.
 */
export default function BodyScrollReset() {
  useEffect(() => {
    const unlock = () => {
      document.body.style.overflow = '';
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') unlock();
    };

    // Unlock immediately on mount.
    unlock();

    // Unlock again when the page is restored from back/forward cache.
    window.addEventListener('pageshow', unlock);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.removeEventListener('pageshow', unlock);
      document.removeEventListener('visibilitychange', onVisibility);
      unlock();
    };
  }, []);

  return null;
}

