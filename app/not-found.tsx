'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { SiteHeader } from '@/components/SiteHeader';
import { buttonVariants } from '@/components/ui/button';
import { useT } from '@/store/useLocaleStore';

export default function NotFound() {
  const t = useT();
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="bg-dot-grid flex flex-1 items-center justify-center px-4 py-20">
        <div className="max-w-md text-center">
          {/* A route that wanders off and stops short of the finish */}
          <svg viewBox="0 0 240 120" className="mx-auto mb-8 w-60" aria-hidden="true">
            <path
              d="M20 92 C 60 92, 58 30, 100 34 S 150 96, 182 66"
              fill="none"
              stroke="#141413"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path d="M182 66 L 214 36" fill="none" stroke="#141413" strokeWidth="4" strokeLinecap="round" strokeDasharray="2 10" />
            <circle cx="20" cy="92" r="7" fill="none" stroke="#141413" strokeWidth="3.5" />
            <circle cx="222" cy="28" r="9" fill="#E4572E" opacity=".25" />
            <circle cx="222" cy="28" r="5" fill="#E4572E" />
          </svg>
          <p className="font-mono text-[11px] tracking-[0.24em] text-muted uppercase">{t('Error 404 · Signal lost')}</p>
          <h1 className="mt-3 font-serif text-5xl leading-tight text-ink sm:text-6xl">
            {t("You're")} <span className="italic">{t('off route.')}</span>
          </h1>
          <p className="mt-4 text-ink-soft">{t("This page doesn't exist. Let's get you back on course.")}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/studio" className={buttonVariants()}>
              {t('Open the studio')} <ArrowRight />
            </Link>
            <Link href="/" className={buttonVariants({ variant: 'secondary' })}>
              {t('Home')}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
