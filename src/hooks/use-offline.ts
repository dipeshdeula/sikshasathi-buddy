import { useState, useEffect } from 'react';

export const useOffline = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const onOff = () => setIsOffline(true);
    const onOn = () => setIsOffline(false);
    window.addEventListener('offline', onOff);
    window.addEventListener('online', onOn);
    return () => {
      window.removeEventListener('offline', onOff);
      window.removeEventListener('online', onOn);
    };
  }, []);

  return isOffline;
};

// Cache helper
export const cache = {
  set: (key: string, data: any) => {
    try { localStorage.setItem(`siksha_cache_${key}`, JSON.stringify({ data, ts: Date.now() })); } catch { /* quota */ }
  },
  get: <T>(key: string): T | null => {
    try {
      const raw = localStorage.getItem(`siksha_cache_${key}`);
      if (!raw) return null;
      return JSON.parse(raw).data as T;
    } catch { return null; }
  },
};
