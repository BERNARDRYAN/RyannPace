import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { siteOrigin } from '@/lib/supabase';
import { STATE_COOKIE, authorizeUrl, cookieOptions, isStravaConfigured } from '@/lib/strava';

/** GET /api/strava/connect -> redirects to Strava's consent screen. */

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const origin = siteOrigin(request);
  if (!isStravaConfigured()) return NextResponse.redirect(`${origin}/studio?strava=unavailable`);
  // Random state, checked on the way back, so nobody can forge a callback.
  const state = crypto.randomUUID();
  (await cookies()).set(STATE_COOKIE, state, cookieOptions(10 * 60));
  return NextResponse.redirect(authorizeUrl(`${origin}/api/strava/callback`, state));
}
