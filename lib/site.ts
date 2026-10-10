/** The live address on Cloudflare Workers. Used when no SITE_URL is set at build time. */
export const PRODUCTION_URL = 'https://ryannpace.ryannpace-app.workers.dev';

/**
 * Cloudflare Web Analytics beacon token. Public by design: it appears in every
 * visitor's page source. NEXT_PUBLIC_CF_ANALYTICS_TOKEN overrides it.
 */
export const CF_ANALYTICS_TOKEN = process.env.NEXT_PUBLIC_CF_ANALYTICS_TOKEN || '0de0466e53224f048b6bc933f0d853b8';

/**
 * Absolute base URL for metadata (link previews, Open Graph images).
 * SITE_URL wins when set; production builds default to the live address;
 * development uses localhost.
 */
export function siteUrl(): string {
  const configured = process.env.SITE_URL?.replace(/\/+$/, '');
  if (configured) return configured;
  return process.env.NODE_ENV === 'production' ? PRODUCTION_URL : 'http://localhost:3000';
}

/**
 * Google OAuth Web client ID for "Sign in with Google" (Google Identity Services).
 * Public by design: Google requires it in the page. NEXT_PUBLIC_GOOGLE_CLIENT_ID overrides it.
 */
export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
