import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase';
import { AUTH_NEXT_COOKIE, safeNextPath } from '@/lib/auth-redirect';

/**
 * GET /auth/callback?code=…
 * Magic-link landing page: trades the one-time code for a session (stored in
 * httpOnly cookies), then returns to the page the user signed in from with
 * ?auth=signed-in|error.
 */

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const cookieStore = await cookies();
  const nextPath = safeNextPath(cookieStore.get(AUTH_NEXT_COOKIE)?.value);
  cookieStore.delete(AUTH_NEXT_COOKIE);

  const destination = new URL(nextPath, url.origin);
  const code = url.searchParams.get('code');

  if (!isSupabaseConfigured() || !code) {
    // Providers report problems as ?error=…&error_code=… (e.g. access_denied when cancelled).
    const reason = url.searchParams.get('error_code') ?? url.searchParams.get('error') ?? 'missing_code';
    destination.searchParams.set('auth', 'error');
    destination.searchParams.set('reason', reason);
    return NextResponse.redirect(destination);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error('[auth/callback] code exchange failed:', error.message);
    destination.searchParams.set('auth', 'error');
    destination.searchParams.set('reason', error.code ?? 'exchange_failed');
  } else {
    destination.searchParams.set('auth', 'signed-in');
  }
  return NextResponse.redirect(destination);
}
