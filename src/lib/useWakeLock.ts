import { useEffect, useState } from 'react';

export const useWakeLock = () => {
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if ('wakeLock' in navigator) {
      setIsSupported(true);
      let wakeLock: any = null;

      const requestWakeLock = async () => {
        try {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        } catch (err: any) {
          console.warn('Wake Lock error:', err.message);
        }
      };

      requestWakeLock();

      const handleVisibilityChange = () => {
        if (wakeLock !== null && document.visibilityState === 'visible') {
          requestWakeLock();
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        if (wakeLock !== null) {
          wakeLock.release().catch((e) => console.error(e?.message || e));
        }
      };
    }
  }, []);

  return { isSupported };
};
