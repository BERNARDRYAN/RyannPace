import { NextResponse } from 'next/server';
import { createSupabaseServerClient, getSessionUser, isSupabaseConfigured } from '@/lib/supabase';
import { getAuthProviders } from '@/lib/auth-providers';

/**
 * GET /api/auth/session -> { configured, user: { id, email } | null, providers: { google } }
 * Only non-sensitive profile fields are returned; tokens stay in httpOnly cookies.
 */

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ configured: false, user: null, providers: { google: false } });
  }
  const supabase = await createSupabaseServerClient();
  const [user, providers] = await Promise.all([getSessionUser(supabase), getAuthProviders()]);
  return NextResponse.json(
    { configured: true, user: user ? { id: user.id, email: user.email ?? null } : null, providers },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
