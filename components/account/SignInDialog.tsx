'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { LoaderCircle, Mail, MailCheck, X } from 'lucide-react';
import { useAccountStore } from '@/store/useAccountStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Step = { kind: 'form'; error?: string } | { kind: 'sending' } | { kind: 'sent'; email: string };

export function SignInDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const open = useAccountStore((s) => s.signInOpen);
  const closeSignIn = useAccountStore((s) => s.closeSignIn);
  const requestMagicLink = useAccountStore((s) => s.requestMagicLink);

  const [email, setEmail] = useState('');
  const [step, setStep] = useState<Step>({ kind: 'form' });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    setStep({ kind: 'sending' });
    const result = await requestMagicLink(trimmed);
    setStep(result.ok ? { kind: 'sent', email: trimmed } : { kind: 'form', error: result.error });
  };

  const close = () => {
    closeSignIn();
    if (step.kind !== 'sending') setStep({ kind: 'form' });
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={close}
      onClick={(e) => {
        // Clicking the backdrop (the dialog element itself) closes it.
        if (e.target === e.currentTarget) close();
      }}
      aria-labelledby="sign-in-title"
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl bg-panel p-0 text-ink shadow-2xl backdrop:bg-ink/40 backdrop:backdrop-blur-sm"
    >
      <div className="relative p-6">
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute top-4 right-4 rounded-full p-1 text-muted hover:bg-black/5 hover:text-ink"
        >
          <X className="size-4" />
        </button>

        {step.kind === 'sent' ? (
          <div className="py-2 text-center">
            <span className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand">
              <MailCheck className="size-6" />
            </span>
            <h2 id="sign-in-title" className="font-serif text-2xl italic">
              Check your inbox
            </h2>
            <p className="mt-2 text-sm text-ink-soft">
              We sent a sign-in link to <span className="font-medium text-ink">{step.email}</span>. Open it in{' '}
              <strong>this browser</strong> to continue.
            </p>
            <p className="mt-3 text-xs text-muted">No email after a minute? Check spam, or try again.</p>
            <Button variant="secondary" size="sm" className="mt-5" onClick={() => setStep({ kind: 'form' })}>
              Use a different email
            </Button>
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate>
            <h2 id="sign-in-title" className="font-serif text-2xl italic">
              Sign in to RyannPace
            </h2>
            <p className="mt-1.5 mb-5 text-sm text-ink-soft">
              Save your poster styles and reuse them on every run. No password needed: we&apos;ll email you a link.
            </p>
            <Label htmlFor="sign-in-email">Email</Label>
            <Input
              id="sign-in-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              aria-invalid={(step.kind === 'form' && !!step.error) || undefined}
              aria-describedby={step.kind === 'form' && step.error ? 'sign-in-error' : undefined}
            />
            {step.kind === 'form' && step.error && (
              <p id="sign-in-error" role="alert" className="mt-2 text-xs text-brand">
                {step.error}
              </p>
            )}
            <Button type="submit" className="mt-4 w-full" disabled={step.kind === 'sending' || !email.trim()}>
              {step.kind === 'sending' ? <LoaderCircle className="animate-spin" /> : <Mail />}
              {step.kind === 'sending' ? 'Sending link…' : 'Email me a sign-in link'}
            </Button>
          </form>
        )}
      </div>
    </dialog>
  );
}
