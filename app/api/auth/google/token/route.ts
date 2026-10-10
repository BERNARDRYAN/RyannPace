import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { errorResponse, readJsonObject } from '@/lib/api';
import { createSupabaseServerClient, isSameOrigin, isSupabaseConfigured } from '@/lib/supabase';
import { GOOGLE_NONCE_COOKIE } from '@/lib/auth-redirect';

/**
 * POST /api/auth/google/token  body { credential }
 * Exchanges a Google ID token (from Google's own sign-in button on this site)
 * for a Supabase session, stored in httpOnly cookies. Supabase verifies the
 * token's signature, audience (our client ID) and nonce.
 */

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return errorResponse(503, 'Sign-in is not configured on this server.');
  if (!isSameOrigin(request)) return errorResponse(403, 'Cross-site request rejected.');

  const parsed = await readJsonObject(request, 8192);
  if ('error' in parsed) return parsed.error;
  const credential = parsed.body.credential;
  if (typeof credential !== 'string' || credential.length > 4096 || credential.split('.').length !== 3) {
    return errorResponse(400, 'Invalid Google sign-in response.');
  }

  const store = await cookies();
  const nonce = store.get(GOOGLE_NONCE_COOKIE)?.value;
  store.delete(GOOGLE_NONCE_COOKIE);
  if (!nonce) return errorResponse(400, 'Google sign-in expired. Please try again.');

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: credential, nonce });
  if (error) {
    console.error('[api/auth/google/token] failed:', error.message);
    return errorResponse(401, 'Google sign-in failed. Please try again.');
  }
  return NextResponse.json({ ok: true });
}
