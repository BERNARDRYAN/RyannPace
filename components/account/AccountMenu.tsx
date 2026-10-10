'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Images, LogIn, LogOut, UserX } from 'lucide-react';
import { DeleteAccountDialog } from '@/components/account/DeleteAccountDialog';
import { useShallow } from 'zustand/react/shallow';
import { useAccountStore } from '@/store/useAccountStore';
import { Button } from '@/components/ui/button';
import { useT } from '@/store/useLocaleStore';

export function AccountMenu() {
  const { status, user, openSignIn, signOut } = useAccountStore(
    useShallow((s) => ({ status: s.status, user: s.user, openSignIn: s.openSignIn, signOut: s.signOut }))
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const t = useT();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  if (status === 'unknown' || status === 'unavailable') return null;

  if (status === 'signed-out' || !user) {
    return (
      <Button onClick={openSignIn} aria-label={t('Sign in')} className="h-9 px-2.5 sm:px-4">
        <LogIn /> <span className="hidden sm:inline">{t('Sign in')}</span>
      </Button>
    );
  }

  const label = user.email ?? t('Account');
  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label={t('Account menu')}
        onClick={() => setMenuOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full py-1 pr-2 pl-1 text-xs text-ink-soft transition-colors hover:bg-black/5"
      >
        <span className="flex size-9 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white uppercase">
          {label.charAt(0)}
        </span>
        <ChevronDown className="size-3.5" />
      </button>
      {menuOpen && (
        <div role="menu" className="absolute right-0 z-40 mt-2 w-60 rounded-xl border border-line bg-panel p-1.5 shadow-xl">
          <div className="px-3 py-2">
            <div className="font-mono text-[10px] tracking-[0.18em] text-muted uppercase">{t('Signed in as')}</div>
            <div className="truncate text-sm text-ink">{label}</div>
          </div>
          <div className="my-1 h-px bg-line" />
          <Link
            href="/gallery"
            role="menuitem"
            onClick={() => setMenuOpen(false)}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-ink hover:bg-black/5"
          >
            <Images className="size-4" /> {t('My gallery')}
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false);
              void signOut();
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-ink hover:bg-black/5"
          >
            <LogOut className="size-4" /> {t('Sign out')}
          </button>
          <div className="my-1 h-px bg-line" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false);
              setDeleteOpen(true);
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-brand hover:bg-brand-soft/60"
          >
            <UserX className="size-4" /> {t('Delete account')}
          </button>
        </div>
      )}
      <DeleteAccountDialog open={deleteOpen} onClose={() => setDeleteOpen(false)} />
    </div>
  );
}
