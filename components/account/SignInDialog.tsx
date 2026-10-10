'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { LoaderCircle, Mail, MailCheck, X } from 'lucide-react';
import { useAccountStore } from '@/store/useAccountStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TURNSTILE_SITE_KEY, Turnstile } from '@/components/account/Turnstile';
import { GoogleSignInButton } from '@/components/account/GoogleSignInButton';
import { GOOGLE_CLIENT_ID } from '@/lib/site';
import { useLocaleStore } from '@/store/useLocaleStore';
import { useT } from '@/store/useLocaleStore';

type Step = { kind: 'form'; error?: string } | { kind: 'sending' } | { kind: 'sent'; email: string };

/** Google's standard multicolour "G", as required by its sign-in branding guidelines. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="size-[18px]" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

export function SignInDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const open = useAccountStore((s) => s.signInOpen);
  const closeSignIn = useAccountStore((s) => s.closeSignIn);
  const requestMagicLink = useAccountStore((s) => s.requestMagicLink);

  const [email, setEmail] = useState('');
  const [step, setStep] = useState<Step>({ kind: 'form' });
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaReset, setCaptchaReset] = useState(0);
  const locale = useLocaleStore((s) => s.locale);
  const needsCaptcha = !!TURNSTILE_SITE_KEY;
  const googleEnabled = useAccountStore((s) => s.providers.google);
  const [googleRedirecting, setGoogleRedirecting] = useState(false);
  // Google's own button (shows this site's address) when a client ID is set and its script loads;
  // otherwise the Supabase redirect flow.
  const [gisUnavailable, setGisUnavailable] = useState(false);
  const useGoogleButton = !!GOOGLE_CLIENT_ID && !gisUnavailable;

  const onGoogleSignedIn = async () => {
    closeSignIn();
    await useAccountStore.getState().init();
    useAccountStore.getState().showNotice({ kind: 'success', text: 'Signed in. Your presets are ready.' });
  };
  const t = useT();

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
    const result = await requestMagicLink(trimmed, captchaToken);
    // Turnstile tokens are single-use: always fetch a fresh one for the next attempt.
    setCaptchaReset((n) => n + 1);
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
          aria-label={t('Close')}
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
              {t('Check your inbox')}
            </h2>
            <p className="mt-2 text-sm text-ink-soft">
              {t('We sent a sign-in link to')} <span className="font-medium text-ink">{step.email}</span>.{' '}
              {t('Open it in this browser to continue.')}
            </p>
            <p className="mt-3 text-xs text-muted">{t('No email after a minute? Check spam, or try again.')}</p>
            <Button variant="secondary" size="sm" className="mt-5" onClick={() => setStep({ kind: 'form' })}>
              {t('Use a different email')}
            </Button>
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate>
            <h2 id="sign-in-title" className="font-serif text-2xl italic">
              {t('Sign in to RyannPace')}
            </h2>
            <p className="mt-1.5 mb-5 text-sm text-ink-soft">
              {t("Save your poster styles and reuse them on every run. No password needed: we'll email you a link.")}
            </p>
            {googleEnabled && (
              <>
                {useGoogleButton ? (
                  <GoogleSignInButton
                    locale={locale}
                    onSignedIn={() => void onGoogleSignedIn()}
                    onError={(message) => setStep({ kind: 'form', error: message })}
                    onUnavailable={() => setGisUnavailable(true)}
                  />
                ) : (
                <a
                  href={`/api/auth/google?next=${encodeURIComponent(typeof window === 'undefined' ? '/studio' : window.location.pathname)}`}
                  onClick={() => setGoogleRedirecting(true)}
                  aria-busy={googleRedirecting}
                  className="flex h-11 w-full items-center justify-center gap-3 rounded-full border border-line-strong bg-white text-sm font-medium text-[#1f1f1f] transition-colors hover:bg-[#f8f8f8]"
                >
                  {googleRedirecting ? <LoaderCircle className="size-4 animate-spin" /> : <GoogleMark />}
                  {t('Continue with Google')}
                </a>
                )}
                <div className="my-4 flex items-center gap-3 text-[11px] tracking-wider text-muted uppercase">
                  <span className="h-px flex-1 bg-line" />
                  {t('or use email')}
                  <span className="h-px flex-1 bg-line" />
                </div>
              </>
            )}
            <Label htmlFor="sign-in-email">{t('Email')}</Label>
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
                {t(step.error)}
              </p>
            )}
            {open && (
              <Turnstile onToken={setCaptchaToken} resetKey={captchaReset} language={locale === 'zh' ? 'zh-cn' : 'en'} />
            )}
            <Button
              type="submit"
              className="mt-4 w-full"
              disabled={step.kind === 'sending' || !email.trim() || (needsCaptcha && !captchaToken)}
            >
              {step.kind === 'sending' ? <LoaderCircle className="animate-spin" /> : <Mail />}
              {step.kind === 'sending' ? t('Sending link…') : t('Email me a sign-in link')}
            </Button>
            <p className="mt-4 text-center text-[11px] leading-relaxed text-muted">
              {t('By continuing you agree to our')}{' '}
              <a href="/privacy" className="underline underline-offset-2 hover:text-ink">
                {t('Privacy Policy')}
              </a>
              .
            </p>
          </form>
        )}
      </div>
    </dialog>
  );
}
