import type { NextConfig } from 'next';
import { CF_ANALYTICS_TOKEN } from './lib/site';

const isDev = process.env.NODE_ENV !== 'production';
// Optional Cloudflare services, allowed in the policy only when configured.
const turnstile = !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const webAnalytics = !!CF_ANALYTICS_TOKEN;

/**
 * Content-Security-Policy, scoped to what the app actually loads:
 * - scripts/styles from this origin ('unsafe-inline' is required by Next's
 *   inline bootstrap scripts without a nonce middleware; dev also needs eval);
 * - images from this origin, data:/blob: (html-to-image renders through
 *   data: SVGs; photos and exports are blobs) and Supabase signed thumbnail URLs;
 * - fonts self-hosted by next/font, inlined as data: during export;
 * - network calls only to our own BFF (Supabase is reached server-side);
 * - Cloudflare Turnstile / Web Analytics origins only when those are enabled.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}${turnstile ? ' https://challenges.cloudflare.com' : ''}${webAnalytics ? ' https://static.cloudflareinsights.com' : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co",
  "font-src 'self' data:",
  `connect-src 'self' data: blob:${isDev ? ' ws: wss:' : ''}${webAnalytics ? ' https://cloudflareinsights.com' : ''}`,
  `frame-src ${turnstile ? 'https://challenges.cloudflare.com' : "'none'"}`,
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ['upgrade-insecure-requests']),
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  // Legacy clickjacking guard for browsers that ignore frame-ancestors.
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  // Browsers only honor HSTS over HTTPS, so this is inert on localhost.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // No next/image optimization: posters render client-side, and Cloudflare
  // Workers can't run sharp. This keeps sharp out of the server bundle.
  images: { unoptimized: true },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
