'use client';

import { useEffect } from 'react';

export default function DevServiceWorkerReset() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    if (!('serviceWorker' in navigator)) return;

    async function resetServiceWorker() {
      const registrations = await navigator.serviceWorker.getRegistrations();
      if (registrations.length > 0) {
        await Promise.all(registrations.map((registration) => registration.unregister()));
      }

      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }
    }

    window.addEventListener('load', () => {
      resetServiceWorker().catch(() => undefined);
    }, { once: true });
  }, []);

  return null;
}
