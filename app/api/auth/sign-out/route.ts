import { NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api';
import { createSupabaseServerClient, isSameOrigin, isSupabaseConfigured } from '@/lib/supabase';

/** POST /api/auth/sign-out — revokes the session and clears the auth cookies. */

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: true });
  if (!isSameOrigin(request)) return errorResponse(403, 'Cross-site request rejected.');

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();
  if (error) console.error('[api/auth/sign-out] failed:', error.message);
  return NextResponse.json({ ok: true });
}
