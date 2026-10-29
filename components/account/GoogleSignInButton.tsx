'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { GOOGLE_CLIENT_ID } from '@/lib/site';

interface GoogleIdApi {
  initialize: (options: Record<string, unknown>) => void;
  renderButton: (el: HTMLElement, options: Record<string, unknown>) => void;
  cancel: () => void;
}

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleIdApi } };
  }
}

const SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
let scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error('Google sign-in failed to load'));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

interface GoogleSignInButtonProps {
  onSignedIn: () => void;
  onError: (message: string) => void;
  /** Called if Google's script can't load (blocked network); the caller shows a fallback. */
  onUnavailable: () => void;
  locale: 'en' | 'zh';
}

/**
 * Google's own "Continue with Google" button (Google Identity Services).
 * Signing in happens on this site, so Google shows this site's address rather
 * than the Supabase project's. The ID token goes to our BFF, which verifies it
 * with Supabase and sets the usual httpOnly session cookies.
 */
export function GoogleSignInButton({ onSignedIn, onError, onUnavailable, locale }: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ onSignedIn, onError, onUnavailable });
  useLayoutEffect(() => {
    callbacks.current = { onSignedIn, onError, onUnavailable };
  });
  // Nonces are single-use; bumping this re-initializes with a fresh one after a failure.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    let cancelled = false;

    (async () => {
      try {
        await loadScript();
        const res = await fetch('/api/auth/google/nonce', { cache: 'no-store', credentials: 'same-origin' });
        const { nonce } = (await res.json()) as { nonce: string };
        const id = window.google?.accounts?.id;
        if (cancelled || !id || !containerRef.current) return;

        id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          nonce,
          context: 'signin',
          ux_mode: 'popup',
          itp_support: true,
          callback: async ({ credential }: { credential?: string }) => {
            if (!credential) return;
            const result = await fetch('/api/auth/google/token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'same-origin',
              body: JSON.stringify({ credential }),
            });
            if (result.ok) {
              callbacks.current.onSignedIn();
            } else {
              const body = (await result.json().catch(() => null)) as { error?: string } | null;
              console.error('[GoogleSignInButton] token exchange failed:', result.status, body?.error);
              callbacks.current.onError(body?.error ?? 'Google sign-in failed. Please try again.');
              setAttempt((n) => n + 1);
            }
          },
        });
        containerRef.current.innerHTML = '';
        id.renderButton(containerRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          text: 'continue_with',
          logo_alignment: 'center',
          width: Math.min(400, containerRef.current.offsetWidth || 320),
          locale: locale === 'zh' ? 'zh_CN' : 'en',
        });
      } catch {
        if (!cancelled) callbacks.current.onUnavailable();
      }
    })();

    return () => {
      cancelled = true;
      window.google?.accounts?.id?.cancel();
    };
  }, [locale, attempt]);

  if (!GOOGLE_CLIENT_ID) return null;
  return <div ref={containerRef} className="flex min-h-11 w-full justify-center" />;
}
