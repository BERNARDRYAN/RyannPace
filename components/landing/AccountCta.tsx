'use client';

import Link from 'next/link';
import { Images, LogIn } from 'lucide-react';
import { useAccountStore } from '@/store/useAccountStore';
import { Button, buttonVariants } from '@/components/ui/button';

/** "Sign in" for visitors, "Open my gallery" once signed in. */
export function AccountCta() {
  const status = useAccountStore((s) => s.status);
  const openSignIn = useAccountStore((s) => s.openSignIn);

  if (status === 'unavailable') return null;
  if (status === 'signed-in') {
    return (
      <Link href="/gallery" className={buttonVariants({ variant: 'secondary' })}>
        <Images /> Open my gallery
      </Link>
    );
  }
  return (
    <Button variant="secondary" onClick={openSignIn} disabled={status === 'unknown'}>
      <LogIn /> Create a free account
    </Button>
  );
}
