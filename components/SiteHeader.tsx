'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { AccountMenu } from '@/components/account/AccountMenu';
import { LogoMark, Wordmark } from '@/components/brand/Logo';

const LINKS = [
  { href: '/studio', label: 'Studio' },
  { href: '/recap', label: 'Recap' },
  { href: '/gallery', label: 'Gallery' },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-line bg-panel/90 px-4 backdrop-blur sm:px-6">
      <Link href="/" className="flex items-center gap-2.5" aria-label="RyannPace home">
        <LogoMark size={36} />
        <Wordmark className="hidden text-lg text-ink min-[400px]:inline [&>span]:text-xl" />
      </Link>

      <div className="flex items-center gap-2 sm:gap-5">
        <nav aria-label="Main" className="flex items-center gap-1 sm:gap-1.5">
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
                {link.label}
              </Link>
            );
          })}
        </nav>
        <AccountMenu />
      </div>
    </header>
  );
}
