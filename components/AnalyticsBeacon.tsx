'use client';

import { useEffect } from 'react';
import { CF_ANALYTICS_TOKEN, PRODUCTION_URL } from '@/lib/site';

/**
 * Cloudflare Web Analytics (cookie-free, no personal data). Loads only on the
 * live hostname, so local development and CI test runs never count as visits.
 */
export function AnalyticsBeacon() {
  useEffect(() => {
    if (!CF_ANALYTICS_TOKEN) return;
    const liveHost = process.env.NEXT_PUBLIC_SITE_URL
      ? new URL(process.env.NEXT_PUBLIC_SITE_URL).hostname
      : new URL(PRODUCTION_URL).hostname;
    if (window.location.hostname !== liveHost) return;
    if (document.querySelector('script[data-cf-beacon]')) return;
    const script = document.createElement('script');
    script.defer = true;
    script.src = 'https://static.cloudflareinsights.com/beacon.min.js';
    script.setAttribute('data-cf-beacon', JSON.stringify({ token: CF_ANALYTICS_TOKEN }));
    document.body.appendChild(script);
  }, []);
  return null;
}
