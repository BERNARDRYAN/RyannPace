/** The live address on Cloudflare Workers. Used when no SITE_URL is set at build time. */
export const PRODUCTION_URL = 'https://ryannpace.ryannpace-app.workers.dev';

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
