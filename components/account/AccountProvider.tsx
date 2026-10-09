'use client';

import { useEffect } from 'react';
import { useAccountStore } from '@/store/useAccountStore';
import { useGalleryStore } from '@/store/useGalleryStore';
import { SignInDialog } from '@/components/account/SignInDialog';
import { Toast } from '@/components/Toast';

/**
 * Mounted once in the root layout: resolves the session on first load, hosts
 * the sign-in dialog and toasts for every page, and clears cached gallery
 * data when the user signs out.
 */
export function AccountProvider() {
  const init = useAccountStore((s) => s.init);
  const status = useAccountStore((s) => s.status);

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    if (status === 'signed-out' || status === 'unavailable') useGalleryStore.getState().reset();
  }, [status]);

  return (
    <>
      <SignInDialog />
      <Toast />
    </>
  );
}
