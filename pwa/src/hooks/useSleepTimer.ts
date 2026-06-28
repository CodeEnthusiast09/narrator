import { useCallback, useEffect, useRef, useState } from 'react';

export function useSleepTimer(onExpire: () => void) {
  const [minutesLeft, setMinutesLeft] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onExpireRef = useRef(onExpire);
  useEffect(() => { onExpireRef.current = onExpire; }, [onExpire]);

  const set = useCallback((minutes: number | null) => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (!minutes) { setMinutesLeft(null); return; }

    let remaining = minutes;
    setMinutesLeft(remaining);

    timerRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(timerRef.current!);
        timerRef.current = null;
        setMinutesLeft(null);
        onExpireRef.current();
      } else {
        setMinutesLeft(remaining);
      }
    }, 60_000);
  }, []);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  return { minutesLeft, set };
}
