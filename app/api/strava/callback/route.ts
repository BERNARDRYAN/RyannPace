import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { siteOrigin } from '@/lib/supabase';
import { STATE_COOKIE, exchangeCode, isStravaConfigured, saveSession } from '@/lib/strava';

/** GET /api/strava/callback?code&state&scope -> stores the encrypted session, back to the studio. */

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const back = (result: string) => NextResponse.redirect(`${siteOrigin(request)}/studio?strava=${result}`);
  const store = await cookies();
  const expected = store.get(STATE_COOKIE)?.value;
  store.delete(STATE_COOKIE);

  if (!isStravaConfigured()) return back('unavailable');
  if (url.searchParams.get('error')) return back('denied'); // the user clicked "Cancel"
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || !state || !expected || state !== expected) return back('error');
  // People can untick the activity permission on Strava's consent screen.
  const scope = url.searchParams.get('scope') ?? '';
  if (!scope.split(',').some((s) => s === 'activity:read' || s === 'activity:read_all')) return back('scope');

  try {
    await saveSession(await exchangeCode(code));
    return back('connected');
  } catch (error) {
    console.error('[api/strava/callback] token exchange failed:', error instanceof Error ? error.message : error);
    return back('error');
  }
}
