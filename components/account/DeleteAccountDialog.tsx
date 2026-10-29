'use client';

import { useEffect, useRef, useState } from 'react';
import { LoaderCircle, TriangleAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAccountStore } from '@/store/useAccountStore';
import { useGalleryStore } from '@/store/useGalleryStore';
import { tr, useT } from '@/store/useLocaleStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/** Confirmation for permanent account deletion: the user must type DELETE. */
export function DeleteAccountDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const t = useT();
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setTyped('');
      setError(null);
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ confirm: 'DELETE' }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? 'Could not delete your account. Please try again.');
        return;
      }
      useGalleryStore.getState().reset();
      useAccountStore.setState({ status: 'signed-out', user: null, presets: [] });
      useAccountStore.getState().showNotice({ kind: 'success', text: tr('Your account and all its data were deleted.') });
      onClose();
      router.push('/');
    } catch {
      setError('Network error. Check your connection.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="delete-account-title"
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl bg-panel p-0 text-ink shadow-2xl backdrop:bg-ink/40 backdrop:backdrop-blur-sm"
    >
      <div className="p-6">
        <span className="mb-4 flex size-11 items-center justify-center rounded-full bg-brand-soft text-brand">
          <TriangleAlert className="size-5" />
        </span>
        <h2 id="delete-account-title" className="font-serif text-2xl">
          {t('Delete your account?')}
        </h2>
        <p className="mt-2 text-sm text-ink-soft">
          {t('This permanently deletes your account, saved presets and every poster in your gallery. This cannot be undone.')}
        </p>
        <label htmlFor="delete-confirm" className="mt-5 mb-1.5 block text-xs text-muted">
          {t('Type DELETE to confirm')}
        </label>
        <Input
          id="delete-confirm"
          value={typed}
          autoComplete="off"
          onChange={(e) => setTyped(e.target.value)}
          placeholder="DELETE"
          className="font-mono"
        />
        {error && (
          <p role="alert" className="mt-2 text-xs text-brand">
            {t(error)}
          </p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {t('Cancel')}
          </Button>
          <Button className="bg-brand hover:bg-brand/90" disabled={typed !== 'DELETE' || busy} onClick={() => void confirm()}>
            {busy && <LoaderCircle className="animate-spin" />}
            {t('Delete account')}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
