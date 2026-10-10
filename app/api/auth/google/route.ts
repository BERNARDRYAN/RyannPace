import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient, isSupabaseConfigured, siteOrigin } from '@/lib/supabase';
import { AUTH_NEXT_COOKIE, safeNextPath } from '@/lib/auth-redirect';
import { getAuthProviders } from '@/lib/auth-providers';

/**
 * GET /api/auth/google?next=/studio
 * Starts "Continue with Google". Supabase handles the Google OAuth exchange;
 * the PKCE verifier is stored in an httpOnly cookie here, and /auth/callback
 * finishes the sign-in exactly like a magic link.
 */

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const origin = siteOrigin(request);
  const next = safeNextPath(new URL(request.url).searchParams.get('next'));
  const fail = (reason: string) => NextResponse.redirect(`${origin}${next}?auth=error&reason=${reason}`);

  if (!isSupabaseConfigured()) return fail('unavailable');
  // signInWithOAuth only builds a URL; check first so nobody lands on a raw provider error page.
  if (!(await getAuthProviders()).google) return fail('provider_disabled');

  (await cookies()).set(AUTH_NEXT_COOKIE, next, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60,
  });

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback`,
      skipBrowserRedirect: true,
      // Always show the account chooser, so people with several Google accounts can pick.
      queryParams: { prompt: 'select_account' },
    },
  });

  if (error || !data?.url) {
    console.error('[api/auth/google] could not start Google sign-in:', error?.message);
    return fail(/not enabled|unsupported provider/i.test(error?.message ?? '') ? 'provider_disabled' : 'oauth_start');
  }
  return NextResponse.redirect(data.url);
}
