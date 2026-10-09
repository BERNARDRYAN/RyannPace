import type { Metadata, Viewport } from 'next';
import { Inter, Instrument_Serif, JetBrains_Mono } from 'next/font/google';
import Script from 'next/script';
import { AccountProvider } from '@/components/account/AccountProvider';

/** Cloudflare Web Analytics (cookie-free). Public token; loads only when configured. */
const CF_ANALYTICS_TOKEN = process.env.NEXT_PUBLIC_CF_ANALYTICS_TOKEN;
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
  metadataBase: new URL(process.env.SITE_URL || 'http://localhost:3000'),
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
        {CF_ANALYTICS_TOKEN && (
          <Script
            src="https://static.cloudflareinsights.com/beacon.min.js"
            strategy="afterInteractive"
            data-cf-beacon={JSON.stringify({ token: CF_ANALYTICS_TOKEN })}
          />
        )}
      </body>
    </html>
  );
}
