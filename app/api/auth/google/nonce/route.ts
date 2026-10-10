import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { GOOGLE_NONCE_COOKIE } from '@/lib/auth-redirect';

/**
 * GET /api/auth/google/nonce -> { nonce: sha256(raw) }
 * The raw value stays in an httpOnly cookie; Google embeds the hash in its ID
 * token, and Supabase checks they match. A token captured elsewhere can't be
 * replayed here, because the attacker doesn't hold this browser's cookie.
 */

export const dynamic = 'force-dynamic';

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function GET() {
  const raw = Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, '0')).join('');
  (await cookies()).set(GOOGLE_NONCE_COOKIE, raw, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 10 * 60,
  });
  return NextResponse.json({ nonce: await sha256Hex(raw) }, { headers: { 'Cache-Control': 'no-store' } });
}
