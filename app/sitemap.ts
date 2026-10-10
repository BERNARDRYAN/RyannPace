import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/site';

/** Public pages for search engines. Gallery and API routes are private, so they're left out. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const now = new Date();
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/studio`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/recap`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];
}
