import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { errorResponse, readJsonObject } from '@/lib/api';
import { AUTH_NEXT_COOKIE, safeNextPath } from '@/lib/auth-redirect';
import {
  createSupabaseServerClient,
  isSameOrigin,
  isSupabaseConfigured,
  siteOrigin,
} from '@/lib/supabase';

/**
 * POST /api/auth/sign-in  body { email, next? }
 * Emails a magic link. The link lands on /auth/callback, which sets the
 * session cookies. Uses the PKCE flow, so the link must be opened in the
 * same browser that requested it.
 */

export const dynamic = 'force-dynamic';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return errorResponse(503, 'Sign-in is not configured on this server.');
  if (!isSameOrigin(request)) return errorResponse(403, 'Cross-site request rejected.');

  const parsed = await readJsonObject(request, 2048);
  if ('error' in parsed) return parsed.error;

  const email = typeof parsed.body.email === 'string' ? parsed.body.email.trim().toLowerCase() : '';
  if (!EMAIL.test(email) || email.length > 254) return errorResponse(400, 'Enter a valid email address.');

  // Present when Turnstile is enabled. Supabase verifies it with the secret stored
  // in its own dashboard, so this server never handles the CAPTCHA secret.
  const captchaToken =
    typeof parsed.body.captchaToken === 'string' && parsed.body.captchaToken.length <= 4096
      ? parsed.body.captchaToken
      : undefined;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${siteOrigin(request)}/auth/callback`,
      shouldCreateUser: true,
      captchaToken,
    },
  });

  if (error) {
    console.error('[api/auth/sign-in] failed:', error.status, error.message);
    if (/captcha/i.test(error.message)) {
      return errorResponse(400, 'Please complete the security check and try again.');
    }
    if (error.status === 429) {
      return errorResponse(429, 'Too many sign-in emails. Wait a few minutes and try again.');
    }
    return errorResponse(502, 'Could not send the sign-in email. Try again shortly.');
  }

  // Where to land after the magic link. Kept in a short-lived cookie rather than the
  // redirect URL, so Supabase's redirect allow-list only needs /auth/callback.
  const cookieStore = await cookies();
  cookieStore.set(AUTH_NEXT_COOKIE, safeNextPath(parsed.body.next), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60,
  });

  return NextResponse.json({ ok: true });
}
