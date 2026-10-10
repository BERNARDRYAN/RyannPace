'use client';

import Link from 'next/link';
import { ArrowRight, Download, FileUp, Images, Layers, ShieldCheck, Smartphone, SquareStack } from 'lucide-react';
import { useT } from '@/store/useLocaleStore';
import { SiteHeader } from '@/components/SiteHeader';
import { buttonVariants } from '@/components/ui/button';
import { FormatShowcase, HeroPosters } from '@/components/landing/LandingShowcase';
import { AccountCta } from '@/components/landing/AccountCta';
import { Logo } from '@/components/brand/Logo';

const STEPS = [
  {
    n: '01',
    title: 'Drop your activity',
    body: 'Export a run from Strava, Garmin Connect, Coros or Apple Health as GPX, FIT or TCX and drop it in. Distance, pace, elevation and heart rate fill themselves in.',
  },
  {
    n: '02',
    title: 'Style it',
    body: 'Pick a template, a palette and a format. Tweak the title, location and gear. Every change shows up live on the poster.',
  },
  {
    n: '03',
    title: 'Export & share',
    body: 'Download a crisp 2160 × 3840 PNG or send it straight to Instagram, WhatsApp or your camera roll from your phone.',
  },
];

const FEATURES = [
  {
    icon: ShieldCheck,
    title: 'Private by design',
    body: 'Files are read on your device, never uploaded. A privacy zone hides where your runs start and end.',
  },
  {
    icon: Layers,
    title: 'Six looks, three formats',
    body: 'Editorial, neon Cyberpunk, Japanese Minimal, race-day Bib, 80s Retro Mag or a clean Stats Card, in 9:16, 4:5 and 1:1.',
  },
  {
    icon: FileUp,
    title: 'Works with your watch',
    body: 'GPX, FIT and TCX from Garmin, Coros, Suunto, Apple Watch and Strava. Kilometres or miles.',
  },
  {
    icon: SquareStack,
    title: 'Monthly & yearly recaps',
    body: 'Drop a month of runs and get one poster with your totals and every route side by side.',
  },
  {
    icon: Download,
    title: 'Retina-sharp exports',
    body: 'Rendered at native 1080 px or 2× for print-quality detail on every screen.',
  },
  {
    icon: Images,
    title: 'Your poster gallery',
    body: 'With a free account, every export is kept and your favourite styles are saved as presets.',
  },
];

const FAQ = [
  {
    q: 'Which files work?',
    a: 'GPX, FIT and TCX. Strava: open the activity on the web → ⋯ menu → Export GPX. Garmin Connect: activity → ⚙ → Export Original (FIT) or Export to GPX. Coros, Suunto and most watch apps have a similar export option.',
  },
  {
    q: 'Is my location data uploaded?',
    a: 'No. Activity files are read inside your browser. If you sign in, only a simplified route outline and your poster settings are saved to your private gallery, never the original file.',
  },
  {
    q: 'Do I need an account?',
    a: 'No. Uploading, designing and exporting all work without one. A free account adds saved presets and a gallery of your past posters.',
  },
  {
    q: 'Does it work on my phone?',
    a: 'Yes. Open it in your mobile browser, design the poster, and use Share to post it straight to Instagram or save it to Photos.',
  },
  {
    q: 'What does it cost?',
    a: 'Nothing. RyannPace is free.',
  },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="font-mono text-[11px] tracking-[0.24em] text-muted uppercase">{children}</p>;
}

export function LandingContent() {
  const t = useT();

  return (
    <div className="min-h-dvh">
      <SiteHeader />

      <main>
        {/* Hero */}
        <section className="bg-dot-grid overflow-hidden border-b border-line">
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:px-10 lg:py-24">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-panel px-3 py-1 font-mono text-[10px] tracking-[0.2em] text-ink-soft uppercase">
                <span className="size-1.5 rounded-full bg-brand" /> {t('Free · No sign-up needed')}
              </p>
              <h1 className="mt-6 font-serif text-[clamp(3rem,7vw,5.5rem)] leading-[0.92] tracking-tight text-ink">
                {t('Your run,')}
                <br />
                <span className="italic">{t('printed like a')}</span>
                <br />
                {t('magazine cover.')}
              </h1>
              <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink-soft">
                {t(
                  'RyannPace turns an activity file from your watch into an editorial-grade poster for Instagram Stories and your feed, in seconds, right in your browser.'
                )}
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href="/studio" className={buttonVariants({ className: 'h-12 px-6 text-base' })}>
                  {t('Open the studio')} <ArrowRight />
                </Link>
                <a href="#how-it-works" className={buttonVariants({ variant: 'ghost', className: 'h-12 px-5' })}>
                  {t('How it works')}
                </a>
              </div>
              <p className="mt-6 text-xs text-muted">
                {t('Works with GPX, FIT and TCX from Strava, Garmin, Coros, Suunto and Apple Watch.')}
              </p>
            </div>
            <HeroPosters />
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="scroll-mt-20 border-b border-line bg-panel">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-10">
            <SectionLabel>{t('How it works')}</SectionLabel>
            <h2 className="mt-2 max-w-2xl font-serif text-4xl leading-tight text-ink sm:text-5xl">
              {t('From finish line to feed in')} <span className="italic">{t('three steps.')}</span>
            </h2>
            <ol className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-3">
              {STEPS.map((step) => (
                <li key={step.n} className="bg-panel p-8">
                  <span className="font-mono text-sm text-brand">{step.n}</span>
                  <h3 className="mt-4 text-xl font-semibold text-ink">{t(step.title)}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">{t(step.body)}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Formats */}
        <section className="border-b border-line">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-10">
            <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
              <div>
                <SectionLabel>{t('Templates, formats & palettes')}</SectionLabel>
                <h2 className="mt-2 max-w-xl font-serif text-4xl leading-tight text-ink sm:text-5xl">
                  {t('Made for')} <span className="italic">{t('every')}</span> {t('feed.')}
                </h2>
              </div>
              <p className="max-w-sm text-sm text-ink-soft">
                {t(
                  'Six templates (Editorial, Cyberpunk, Minimal, Race Bib, Retro Mag and Stats Card), three formats and twenty-six palettes. Switch instantly; the layout re-flows itself.'
                )}
              </p>
            </div>
            <FormatShowcase />
          </div>
        </section>

        {/* Features */}
        <section className="border-b border-line bg-panel">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-10">
            <SectionLabel>{t('Why RyannPace')}</SectionLabel>
            <h2 className="mt-2 max-w-2xl font-serif text-4xl leading-tight text-ink sm:text-5xl">
              {t('Designed like print.')} <span className="italic">{t('Built for runners.')}</span>
            </h2>
            <div className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, body }) => (
                <div key={title}>
                  <span className="flex size-10 items-center justify-center rounded-xl bg-studio text-ink">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="mt-4 font-semibold text-ink">{t(title)}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{t(body)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Account */}
        <section className="border-b border-line bg-ink text-white">
          <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_auto] lg:px-10">
            <div>
              <p className="font-mono text-[11px] tracking-[0.24em] text-white/60 uppercase">{t('Free account')}</p>
              <h2 className="mt-2 font-serif text-4xl leading-tight sm:text-5xl">
                {t('Keep every poster.')} <span className="italic">{t('Reuse every style.')}</span>
              </h2>
              <p className="mt-3 max-w-xl text-white/70">
                {t(
                  'Sign in with just your email: no password. Your exports land in a private gallery, and your favourite looks are saved as presets.'
                )}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 [&_a]:bg-white [&_button]:bg-white">
              <AccountCta />
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section>
          <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
            <SectionLabel>{t('Questions')}</SectionLabel>
            <h2 className="mt-2 font-serif text-4xl text-ink sm:text-5xl">{t('Good to know')}</h2>
            <div className="mt-10 divide-y divide-line border-y border-line">
              {FAQ.map((item) => (
                <details key={item.q} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left font-medium text-ink [&::-webkit-details-marker]:hidden">
                    {t(item.q)}
                    <span className="font-mono text-lg text-muted transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-ink-soft">{t(item.a)}</p>
                </details>
              ))}
            </div>
            <div className="mt-14 text-center">
              <Link href="/studio" className={buttonVariants({ className: 'h-12 px-6 text-base' })}>
                {t('Make your first poster')} <ArrowRight />
              </Link>
              <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted">
                <Smartphone className="size-3.5" /> {t('Works on desktop and mobile')}
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-panel">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-xs text-muted sm:px-6 lg:px-10">
          <span className="flex items-center gap-3">
            <Logo size={28} wordmarkClassName="text-base" />
            <span className="hidden sm:inline">{t('Editorial running posters from your activity files.')}</span>
          </span>
          <nav aria-label="Footer" className="flex gap-5">
            <Link href="/studio" className="hover:text-ink">
              {t('Studio')}
            </Link>
            <Link href="/recap" className="hover:text-ink">
              {t('Recap')}
            </Link>
            <Link href="/gallery" className="hover:text-ink">
              {t('Gallery')}
            </Link>
            <Link href="/privacy" className="hover:text-ink">
              {t('Privacy Policy')}
            </Link>
          </nav>
          <span>© {new Date().getFullYear()} RyannPace</span>
        </div>
      </footer>
    </div>
  );
}
