'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { AccountMenu } from '@/components/account/AccountMenu';
import { LogoMark, Wordmark } from '@/components/brand/Logo';
import { useLocaleStore, useT } from '@/store/useLocaleStore';

const LINKS = [
  { href: '/studio', label: 'Studio' },
  { href: '/recap', label: 'Recap' },
  { href: '/gallery', label: 'Gallery' },
];

function LanguageToggle() {
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const next = locale === 'zh' ? 'en' : 'zh';
  return (
    <button
      type="button"
      onClick={() => setLocale(next)}
      aria-label={next === 'zh' ? '切换到中文' : 'Switch to English'}
      title={next === 'zh' ? '中文' : 'English'}
      className="flex h-9 min-w-9 items-center justify-center rounded-full border border-line px-2 text-xs font-semibold text-ink-soft transition-colors hover:border-ink/40 hover:text-ink"
    >
      {next === 'zh' ? '中' : 'EN'}
    </button>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const t = useT();

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-line bg-panel/90 px-4 backdrop-blur sm:px-6">
      <Link href="/" className="flex items-center gap-2.5" aria-label="RyannPace home">
        <LogoMark size={36} />
        <Wordmark className="hidden text-lg text-ink min-[400px]:inline [&>span]:text-xl" />
      </Link>

      <div className="flex items-center gap-1.5 sm:gap-4">
        <nav aria-label="Main" className="flex items-center gap-0.5 sm:gap-1.5">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'rounded-full px-2.5 py-1.5 text-sm font-medium transition-colors sm:px-4 sm:py-2',
                  active ? 'bg-ink text-white' : 'text-ink-soft hover:bg-black/5 hover:text-ink'
                )}
              >
                {t(link.label)}
              </Link>
            );
          })}
        </nav>
        <LanguageToggle />
        <AccountMenu />
      </div>
    </header>
  );
}
