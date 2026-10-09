import { NextResponse } from 'next/server';
import { createSupabaseServerClient, getSessionUser, isSupabaseConfigured } from '@/lib/supabase';

/**
 * GET /api/auth/session -> { configured, user: { id, email } | null }
 * Only non-sensitive profile fields are returned; tokens stay in httpOnly cookies.
 */

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ configured: false, user: null });
  }
  const supabase = await createSupabaseServerClient();
  const user = await getSessionUser(supabase);
  return NextResponse.json(
    { configured: true, user: user ? { id: user.id, email: user.email ?? null } : null },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
