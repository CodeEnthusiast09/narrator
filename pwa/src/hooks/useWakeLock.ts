import { useEffect, useRef } from 'react';

export function useWakeLock(active: boolean) {
  const sentinelRef = useRef<WakeLockSentinel | null>(null);

  const acquire = async () => {
    if (!('wakeLock' in navigator)) return;
    try {
      sentinelRef.current = await navigator.wakeLock.request('screen');
    } catch {
      // Denied or not supported in this context — fail silently
    }
  };

  const release = () => {
    sentinelRef.current?.release();
    sentinelRef.current = null;
  };

  useEffect(() => {
    if (active) {
      void acquire();
    } else {
      release();
    }
    return release;
  }, [active]);

  // Browser drops the lock when the page is hidden — re-acquire on return
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && active) {
        void acquire();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [active]);
}
