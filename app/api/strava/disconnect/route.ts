import { NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api';
import { isSameOrigin } from '@/lib/supabase';
import { clearSession, deauthorize, getSession } from '@/lib/strava';

/** POST /api/strava/disconnect -> revokes access on Strava and clears the cookie. */

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return errorResponse(403, 'Cross-site request rejected.');
  const session = await getSession();
  if (session) await deauthorize(session);
  await clearSession();
  return NextResponse.json({ ok: true });
}
