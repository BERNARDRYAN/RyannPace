import type { Metadata } from 'next';
import { LandingContent } from '@/components/landing/LandingContent';
import { siteUrl } from '@/lib/site';

export const metadata: Metadata = {
  title: { absolute: 'RyannPace — Turn your runs into editorial posters' },
  alternates: { canonical: '/' },
  description:
    'Drop in a GPX, FIT or TCX file from Strava, Garmin, Coros or Apple Watch and get a magazine-grade 9:16, 4:5 or 1:1 poster in seconds. Free, private, in your browser.',
};

/** Structured data so search engines understand RyannPace is a free web app. */
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'RyannPace',
  url: siteUrl(),
  applicationCategory: 'DesignApplication',
  operatingSystem: 'Any (web browser)',
  description:
    'Turn GPX, FIT or TCX files from Strava, Garmin, Coros or Apple Watch into editorial running posters for Instagram and Xiaohongshu.',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  inLanguage: ['en', 'zh-CN'],
};

export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        // Static JSON built from constants above; nothing user-provided.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <LandingContent />
    </>
  );
}
