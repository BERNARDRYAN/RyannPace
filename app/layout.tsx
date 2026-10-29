import type { Metadata, Viewport } from 'next';
import { Inter, Instrument_Serif, JetBrains_Mono } from 'next/font/google';
import { siteUrl } from '@/lib/site';
import { AnalyticsBeacon } from '@/components/AnalyticsBeacon';
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration';
import { AccountProvider } from '@/components/account/AccountProvider';

import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-instrument-serif',
  display: 'swap',
});

export const metadata: Metadata = {
  // Absolute base for social preview images; SITE_URL is set in production.
  metadataBase: new URL(siteUrl()),
  openGraph: { type: 'website', siteName: 'RyannPace' },
  twitter: { card: 'summary_large_image' },
  title: { default: 'RyannPace — Editorial Running Posters', template: '%s · RyannPace' },
  description:
    'Turn GPX tracks and workout metrics into magazine-grade 9:16 and 1:1 posters in seconds.',
  applicationName: 'RyannPace',
  appleWebApp: { capable: true, title: 'RyannPace', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  themeColor: '#f3f1ec',
  viewportFit: 'cover',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} ${instrumentSerif.variable}`}
    >
      <body>
        {children}
        <AccountProvider />
        <AnalyticsBeacon />
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
