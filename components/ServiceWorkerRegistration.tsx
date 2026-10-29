'use client';

import { useEffect } from 'react';

/** Registers public/sw.js, which lets the installed app receive shared activity files. */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Unsupported or blocked: sharing into the app just isn't available.
    });
  }, []);
  return null;
}
